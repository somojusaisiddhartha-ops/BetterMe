import {
  INVITATION_CODE_LENGTH,
  INVITATION_EXPIRY_DAYS,
  LOCAL_STORAGE_PENDING_INVITE_KEY,
} from "@/lib/constants";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fail, mapDatabaseError, normalizeEmail, ok, type ServiceResult } from "@/lib/services/shared";
import type { Invitation } from "@/types/domain";

const ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInvitationCode() {
  return Array.from({ length: INVITATION_CODE_LENGTH })
    .map(() => ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)])
    .join("");
}

function getExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + INVITATION_EXPIRY_DAYS);
  return date.toISOString();
}

export function setPendingInvitationCode(code: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_STORAGE_PENDING_INVITE_KEY, code);
}

export function consumePendingInvitationCode() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(LOCAL_STORAGE_PENDING_INVITE_KEY);
  if (!value) {
    return null;
  }

  window.localStorage.removeItem(LOCAL_STORAGE_PENDING_INVITE_KEY);
  return value;
}

export async function getInvitationByCode(
  invitationCode: string,
): Promise<ServiceResult<Invitation | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("invitation_code", invitationCode)
    .maybeSingle<Invitation>();

  if (error) {
    return fail(mapDatabaseError(error, "Could not validate invitation."));
  }

  if (!data) {
    return ok(null);
  }

  return ok(data);
}

export async function createInvitation(
  inviterUserId: string,
  inviterName: string,
  invitedEmail: string,
): Promise<ServiceResult<Invitation>> {
  const normalizedEmail = normalizeEmail(invitedEmail);
  const supabase = getSupabaseClient();

  const rpcResult = await supabase.rpc("create_invitation", {
    p_invited_email: normalizedEmail,
  });

  if (!rpcResult.error) {
    const created = rpcResult.data as Invitation;
    return ok(created);
  }

  if (rpcResult.error.code !== "42883" && rpcResult.error.code !== "PGRST202") {
    return fail(mapDatabaseError(rpcResult.error, "Could not generate invitation."));
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateInvitationCode();

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        invitation_code: code,
        invited_email: normalizedEmail,
        invited_by_user_id: inviterUserId,
        invited_by_username: inviterName,
        is_used: false,
        expires_at: getExpiryDate(),
      })
      .select("*")
      .single<Invitation>();

    if (!error && data) {
      return ok(data);
    }

    if (error?.code !== "23505") {
      return fail(mapDatabaseError(error, "Could not generate invitation."));
    }
  }

  return fail("Could not generate a unique invitation code. Please try again.");
}

export async function redeemInvitation(
  invitationCode: string,
  currentUserId: string,
  currentUserEmail?: string,
): Promise<ServiceResult<boolean>> {
  const supabase = getSupabaseClient();

  const rpcResult = await supabase.rpc("redeem_invitation", {
    p_invitation_code: invitationCode,
  });

  if (!rpcResult.error) {
    return ok(true);
  }

  if (rpcResult.error.code !== "42883" && rpcResult.error.code !== "PGRST202") {
    return fail(mapDatabaseError(rpcResult.error, "Could not redeem invitation."));
  }

  const invitationResult = await getInvitationByCode(invitationCode);

  if (invitationResult.error) {
    return fail(invitationResult.error);
  }

  if (!invitationResult.data) {
    return fail("Invitation not found.");
  }

  const invitation = invitationResult.data;

  if (invitation.is_used) {
    return fail("Invitation has already been used.");
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return fail("Invitation has expired.");
  }

  if (currentUserEmail && normalizeEmail(currentUserEmail) !== normalizeEmail(invitation.invited_email)) {
    return fail("This invitation is for a different email address.");
  }

  const { error: updateInvitationError } = await supabase
    .from("invitations")
    .update({ is_used: true, redeemed_by_user_id: currentUserId })
    .eq("id", invitation.id)
    .eq("is_used", false);

  if (updateInvitationError) {
    return fail(mapDatabaseError(updateInvitationError, "Could not redeem invitation."));
  }

  const { error: updateUserError } = await supabase
    .from("users")
    .update({
      is_invited: true,
      invited_by_user_id: invitation.invited_by_user_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentUserId);

  if (updateUserError) {
    return fail(mapDatabaseError(updateUserError, "Could not update invited user metadata."));
  }

  const { data: existingRelationship, error: existingRelationshipError } = await supabase
    .from("friend_relationships")
    .select("id")
    .or(
      `and(user_id.eq.${currentUserId},friend_id.eq.${invitation.invited_by_user_id}),and(user_id.eq.${invitation.invited_by_user_id},friend_id.eq.${currentUserId})`,
    )
    .maybeSingle<{ id: string }>();

  if (existingRelationshipError) {
    return fail(mapDatabaseError(existingRelationshipError, "Could not verify friendship status."));
  }

  if (!existingRelationship) {
    const { error: insertFriendError } = await supabase.from("friend_relationships").insert({
      user_id: currentUserId,
      friend_id: invitation.invited_by_user_id,
      status: "accepted",
    });

    if (insertFriendError) {
      return fail(mapDatabaseError(insertFriendError, "Could not auto-connect invited users as friends."));
    }
  }

  return ok(true);
}
