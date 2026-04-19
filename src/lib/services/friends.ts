import { getSupabaseClient } from "@/lib/supabase/client";
import { fail, mapDatabaseError, ok, type ServiceResult } from "@/lib/services/shared";
import { getUsersByIds } from "@/lib/services/users";
import type {
  AppUser,
  FriendRelationship,
  FriendsSnapshot,
  FriendStatus,
  FriendRequestView,
} from "@/types/domain";

function getOtherUserId(relationship: FriendRelationship, currentUserId: string) {
  return relationship.user_id === currentUserId ? relationship.friend_id : relationship.user_id;
}

function getDirection(relationship: FriendRelationship, currentUserId: string) {
  return relationship.friend_id === currentUserId ? "incoming" : "outgoing";
}

export async function getFriendsSnapshot(
  currentUserId: string,
): Promise<ServiceResult<FriendsSnapshot>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("friend_relationships")
    .select("*")
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false });

  if (error) {
    return fail(mapDatabaseError(error, "Could not load friends."));
  }

  const relationships = ((data ?? []) as FriendRelationship[]).filter(
    (item) => item.user_id !== item.friend_id,
  );

  const uniqueUserIds = Array.from(
    new Set(relationships.map((relationship) => getOtherUserId(relationship, currentUserId))),
  );

  const usersResult = await getUsersByIds(uniqueUserIds);
  if (usersResult.error || !usersResult.data) {
    return fail(usersResult.error ?? "Could not load friend profiles.");
  }

  const userById = new Map<string, AppUser>(usersResult.data.map((user) => [user.id, user]));

  const incomingRequests: FriendRequestView[] = [];
  const outgoingRequests: FriendRequestView[] = [];
  const acceptedFriends: AppUser[] = [];

  for (const relationship of relationships) {
    const otherUser = userById.get(getOtherUserId(relationship, currentUserId));

    if (!otherUser) {
      continue;
    }

    if (relationship.status === "accepted") {
      acceptedFriends.push(otherUser);
      continue;
    }

    const direction = getDirection(relationship, currentUserId);
    const requestView: FriendRequestView = {
      relationshipId: relationship.id,
      user: otherUser,
      status: relationship.status,
      direction,
    };

    if (direction === "incoming") {
      incomingRequests.push(requestView);
    } else {
      outgoingRequests.push(requestView);
    }
  }

  return ok({
    incomingRequests,
    outgoingRequests,
    acceptedFriends,
  });
}

async function checkExistingRelationship(
  currentUserId: string,
  targetUserId: string,
): Promise<ServiceResult<FriendStatus | null>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("friend_relationships")
    .select("status")
    .or(
      `and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`,
    )
    .maybeSingle<{ status: FriendStatus }>();

  if (error) {
    return fail(mapDatabaseError(error, "Could not validate friend relationship."));
  }

  return ok(data?.status ?? null);
}

export async function sendFriendRequest(
  currentUserId: string,
  targetUserId: string,
): Promise<ServiceResult<boolean>> {
  if (currentUserId === targetUserId) {
    return fail("You cannot add yourself as a friend.");
  }

  const supabase = getSupabaseClient();

  const rpcResult = await supabase.rpc("send_friend_request", {
    p_friend_id: targetUserId,
  });

  if (!rpcResult.error) {
    return ok(true);
  }

  if (rpcResult.error.code !== "42883" && rpcResult.error.code !== "PGRST202") {
    return fail(mapDatabaseError(rpcResult.error, "Could not send friend request."));
  }

  const existing = await checkExistingRelationship(currentUserId, targetUserId);
  if (existing.error) {
    return fail(existing.error);
  }

  if (existing.data === "accepted") {
    return fail("You are already friends with this user.");
  }

  if (existing.data === "pending") {
    return fail("A friend request already exists.");
  }

  const { error } = await supabase.from("friend_relationships").insert({
    user_id: currentUserId,
    friend_id: targetUserId,
    status: "pending",
  });

  if (error) {
    return fail(mapDatabaseError(error, "Could not send friend request."));
  }

  return ok(true);
}

export async function acceptFriendRequest(
  relationshipId: string,
): Promise<ServiceResult<boolean>> {
  const supabase = getSupabaseClient();

  const rpcResult = await supabase.rpc("accept_friend_request", {
    p_relationship_id: relationshipId,
  });

  if (!rpcResult.error) {
    return ok(true);
  }

  if (rpcResult.error.code !== "42883" && rpcResult.error.code !== "PGRST202") {
    return fail(mapDatabaseError(rpcResult.error, "Could not accept friend request."));
  }

  const { error } = await supabase
    .from("friend_relationships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", relationshipId)
    .eq("status", "pending");

  if (error) {
    return fail(mapDatabaseError(error, "Could not accept friend request."));
  }

  return ok(true);
}

export async function rejectFriendRequest(
  relationshipId: string,
): Promise<ServiceResult<boolean>> {
  const supabase = getSupabaseClient();

  const rpcResult = await supabase.rpc("reject_friend_request", {
    p_relationship_id: relationshipId,
  });

  if (!rpcResult.error) {
    return ok(true);
  }

  if (rpcResult.error.code !== "42883" && rpcResult.error.code !== "PGRST202") {
    return fail(mapDatabaseError(rpcResult.error, "Could not reject friend request."));
  }

  const { error } = await supabase
    .from("friend_relationships")
    .delete()
    .eq("id", relationshipId)
    .eq("status", "pending");

  if (error) {
    return fail(mapDatabaseError(error, "Could not reject friend request."));
  }

  return ok(true);
}

export async function cancelFriendRequest(
  relationshipId: string,
): Promise<ServiceResult<boolean>> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("friend_relationships")
    .delete()
    .eq("id", relationshipId)
    .eq("status", "pending");

  if (error) {
    return fail(mapDatabaseError(error, "Could not cancel friend request."));
  }

  return ok(true);
}

export async function unfriend(
  currentUserId: string,
  targetUserId: string,
): Promise<ServiceResult<boolean>> {
  const supabase = getSupabaseClient();

  const rpcResult = await supabase.rpc("unfriend", {
    p_friend_id: targetUserId,
  });

  if (!rpcResult.error) {
    return ok(true);
  }

  if (rpcResult.error.code !== "42883" && rpcResult.error.code !== "PGRST202") {
    return fail(mapDatabaseError(rpcResult.error, "Could not remove friend."));
  }

  const { error } = await supabase
    .from("friend_relationships")
    .delete()
    .eq("status", "accepted")
    .or(
      `and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`,
    );

  if (error) {
    return fail(mapDatabaseError(error, "Could not remove friend."));
  }

  return ok(true);
}
