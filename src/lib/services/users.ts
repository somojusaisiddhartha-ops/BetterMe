import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AppUser } from "@/types/domain";
import { mapDatabaseError, normalizeEmail, ok, fail, type ServiceResult } from "@/lib/services/shared";

type ProfileUpdate = Partial<Pick<AppUser, "full_name" | "avatar_url" | "consistency_score" | "total_xp" | "profile_points" | "tier">>;

function pickName(user: User) {
  const candidate = [
    user.user_metadata?.full_name,
    user.user_metadata?.name,
    user.user_metadata?.given_name,
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  return typeof candidate === "string" ? candidate : null;
}

function pickAvatar(user: User) {
  const avatarUrl = user.user_metadata?.avatar_url;
  return typeof avatarUrl === "string" && avatarUrl.length > 0 ? avatarUrl : null;
}

export async function syncUserProfileFromAuthUser(authUser: User): Promise<ServiceResult<AppUser>> {
  const supabase = getSupabaseClient();

  const payload = {
    id: authUser.id,
    email: normalizeEmail(authUser.email ?? ""),
    full_name: pickName(authUser),
    avatar_url: pickAvatar(authUser),
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: false })
    .select("*")
    .single<AppUser>();

  if (error) {
    return fail(mapDatabaseError(error, "Failed to sync profile."));
  }

  return ok(data);
}

export async function getCurrentUserProfile(userId: string): Promise<ServiceResult<AppUser>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single<AppUser>();

  if (error) {
    return fail(mapDatabaseError(error, "Could not load your profile."));
  }

  return ok(data);
}

export async function updateCurrentUserProfile(
  userId: string,
  updates: ProfileUpdate,
): Promise<ServiceResult<AppUser>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("*")
    .single<AppUser>();

  if (error) {
    return fail(mapDatabaseError(error, "Could not update your profile."));
  }

  return ok(data);
}

export async function searchUserByEmail(
  email: string,
  currentUserId: string,
): Promise<ServiceResult<AppUser | null>> {
  const supabase = getSupabaseClient();
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle<AppUser>();

  if (error) {
    return fail(mapDatabaseError(error, "Could not search by email."));
  }

  if (!data || data.id === currentUserId) {
    return ok(null);
  }

  return ok(data);
}

export async function getUsersByIds(ids: string[]): Promise<ServiceResult<AppUser[]>> {
  if (ids.length === 0) {
    return ok([]);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("users").select("*").in("id", ids);

  if (error) {
    return fail(mapDatabaseError(error, "Could not fetch users."));
  }

  return ok((data ?? []) as AppUser[]);
}

export async function getLeaderboardUsers(
  pageSize: number,
  page: number,
): Promise<ServiceResult<AppUser[]>> {
  const supabase = getSupabaseClient();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("total_xp", { ascending: false })
    .order("updated_at", { ascending: true })
    .range(from, to);

  if (error) {
    return fail(mapDatabaseError(error, "Could not load leaderboard."));
  }

  return ok((data ?? []) as AppUser[]);
}

export async function getUserRankByXp(totalXp: number): Promise<ServiceResult<number>> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .gt("total_xp", totalXp);

  if (error) {
    return fail(mapDatabaseError(error, "Could not calculate rank."));
  }

  return ok((count ?? 0) + 1);
}
