import { LEADERBOARD_PAGE_SIZE } from "@/lib/constants";
import { getUserRankByXp, getLeaderboardUsers } from "@/lib/services/users";
import { fail, ok, type ServiceResult } from "@/lib/services/shared";
import type { AppUser, Tier } from "@/types/domain";

export interface LeaderboardEntry {
  rank: number;
  user: AppUser;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  hasMore: boolean;
}

function withRank(users: AppUser[], startRank: number) {
  return users.map((user, index) => ({
    rank: startRank + index,
    user,
  }));
}

export async function getLeaderboard(
  page: number,
  pageSize = LEADERBOARD_PAGE_SIZE,
  tierFilter: Tier | "All" = "All",
): Promise<ServiceResult<LeaderboardResponse>> {
  const usersResult = await getLeaderboardUsers(pageSize, page);

  if (usersResult.error || !usersResult.data) {
    return fail(usersResult.error ?? "Could not load leaderboard.");
  }

  const filteredUsers =
    tierFilter === "All"
      ? usersResult.data
      : usersResult.data.filter((entry) => entry.tier === tierFilter);

  const entries = withRank(filteredUsers, page * pageSize + 1);

  return ok({
    entries,
    hasMore: usersResult.data.length === pageSize,
  });
}

export async function getUserRank(currentUser: AppUser): Promise<ServiceResult<number>> {
  return getUserRankByXp(currentUser.total_xp);
}
