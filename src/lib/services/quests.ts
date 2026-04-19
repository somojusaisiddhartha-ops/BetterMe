import { DIFFICULTY_REWARDS } from "@/lib/constants";
import { resolveTier } from "@/lib/progression";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getIstDateString,
  getIstWeekDates,
  getIstWeekdayCode,
  isSameIsoWeek,
} from "@/lib/time";
import { fail, mapDatabaseError, ok, type ServiceResult } from "@/lib/services/shared";
import type {
  AppUser,
  Quest,
  QuestCategory,
  QuestDifficulty,
  QuestFrequency,
  TodayQuestBuckets,
} from "@/types/domain";

type QuestDraft = {
  title: string;
  category: QuestCategory;
  frequency: QuestFrequency;
  specific_days: string[] | null;
  difficulty: QuestDifficulty;
};

function normalizeSpecificDays(days: string[] | null | undefined) {
  if (!days || days.length === 0) {
    return null;
  }

  return Array.from(new Set(days.map((item) => item.trim()).filter(Boolean)));
}

function normalizeQuest(quest: Quest): Quest {
  return {
    ...quest,
    completed_dates: Array.isArray(quest.completed_dates) ? quest.completed_dates : [],
    specific_days: normalizeSpecificDays(quest.specific_days),
  };
}

function shouldQuestBeScheduledToday(quest: Quest, todayCode: string) {
  if (quest.frequency === "Daily") {
    return true;
  }

  if (quest.frequency === "Weekly") {
    return true;
  }

  const specificDays = normalizeSpecificDays(quest.specific_days);
  if (!specificDays || specificDays.length === 0) {
    return false;
  }

  // Accept both unique weekday codes (Tu/Th/Sa/Su) and short legacy values (T/S).
  if (specificDays.includes(todayCode)) {
    return true;
  }

  if (todayCode === "Tu" || todayCode === "Th") {
    return specificDays.includes("T");
  }

  if (todayCode === "Sa" || todayCode === "Su") {
    return specificDays.includes("S");
  }

  return false;
}

function isQuestCompletedInCurrentWeek(quest: Quest, todayDate: string) {
  return quest.completed_dates.some((completedDate) => isSameIsoWeek(completedDate, todayDate));
}

function isQuestCompletedForToday(quest: Quest, todayDate: string) {
  if (quest.frequency === "Weekly") {
    return isQuestCompletedInCurrentWeek(quest, todayDate);
  }

  return quest.completed_dates.includes(todayDate);
}

function dedupeDates(dates: string[]) {
  return Array.from(new Set(dates)).sort((left, right) => left.localeCompare(right));
}

function calculateWeeklyConsistency(quests: Quest[], todayDate: string) {
  const weekDates = getIstWeekDates();
  const todayIndex = weekDates.findIndex((date) => date === todayDate);
  const effectiveWeekDates = weekDates.slice(0, todayIndex >= 0 ? todayIndex + 1 : 7);

  let totalPossible = 0;
  let completedCount = 0;

  for (const quest of quests) {
    const completionDatesThisWeek = quest.completed_dates.filter((date) =>
      effectiveWeekDates.includes(date),
    );

    if (quest.frequency === "Daily") {
      totalPossible += effectiveWeekDates.length;
      completedCount += completionDatesThisWeek.length;
      continue;
    }

    if (quest.frequency === "Weekly") {
      totalPossible += 1;
      completedCount += completionDatesThisWeek.length > 0 ? 1 : 0;
      continue;
    }

    const specificDays = normalizeSpecificDays(quest.specific_days) ?? [];
    const possibleForQuest = effectiveWeekDates.filter((date) => {
      const d = new Date(`${date}T00:00:00.000Z`);
      const weekday = d.getUTCDay();
      const weekdayCode = ["Su", "M", "Tu", "W", "Th", "F", "Sa"][weekday] ?? "M";

      if (specificDays.includes(weekdayCode)) {
        return true;
      }

      if ((weekdayCode === "Tu" || weekdayCode === "Th") && specificDays.includes("T")) {
        return true;
      }

      if ((weekdayCode === "Sa" || weekdayCode === "Su") && specificDays.includes("S")) {
        return true;
      }

      return false;
    }).length;

    totalPossible += possibleForQuest;
    completedCount += completionDatesThisWeek.length;
  }

  if (totalPossible === 0) {
    return 0;
  }

  return Math.min(100, Math.round((completedCount / totalPossible) * 100));
}

async function updateConsistencyScore(userId: string): Promise<ServiceResult<number>> {
  const questsResult = await listUserQuests(userId);

  if (questsResult.error || !questsResult.data) {
    return fail(questsResult.error ?? "Could not refresh consistency score.");
  }

  const todayDate = getIstDateString();
  const consistency = calculateWeeklyConsistency(questsResult.data, todayDate);

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({ consistency_score: consistency, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    return fail(mapDatabaseError(error, "Could not update consistency score."));
  }

  return ok(consistency);
}

function getQuestRewards(difficulty: QuestDifficulty) {
  return DIFFICULTY_REWARDS[difficulty];
}

export async function listUserQuests(userId: string): Promise<ServiceResult<Quest[]>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return fail(mapDatabaseError(error, "Could not load quests."));
  }

  return ok(((data ?? []) as Quest[]).map(normalizeQuest));
}

export async function getTodayQuestBuckets(userId: string): Promise<ServiceResult<TodayQuestBuckets>> {
  const questsResult = await listUserQuests(userId);

  if (questsResult.error || !questsResult.data) {
    return fail(questsResult.error ?? "Could not load today\'s quests.");
  }

  const todayDate = getIstDateString();
  const todayCode = getIstWeekdayCode();
  const pending: Quest[] = [];
  const completed: Quest[] = [];

  for (const quest of questsResult.data) {
    if (!shouldQuestBeScheduledToday(quest, todayCode)) {
      continue;
    }

    if (isQuestCompletedForToday(quest, todayDate)) {
      completed.push(quest);
      continue;
    }

    pending.push(quest);
  }

  return ok({
    pending,
    completed,
    totalDue: pending.length + completed.length,
  });
}

export async function createQuest(
  userId: string,
  draft: QuestDraft,
): Promise<ServiceResult<Quest>> {
  const supabase = getSupabaseClient();
  const rewards = getQuestRewards(draft.difficulty);

  const payload = {
    user_id: userId,
    title: draft.title.trim(),
    category: draft.category,
    frequency: draft.frequency,
    specific_days: draft.frequency === "Specific Days" ? normalizeSpecificDays(draft.specific_days) : null,
    difficulty: draft.difficulty,
    xp_reward: rewards.xp,
    profile_points_reward: rewards.profilePoints,
    completed_dates: [],
    is_completed_today: false,
  };

  const { data, error } = await supabase
    .from("quests")
    .insert(payload)
    .select("*")
    .single<Quest>();

  if (error) {
    return fail(mapDatabaseError(error, "Could not create quest."));
  }

  await updateConsistencyScore(userId);
  return ok(normalizeQuest(data));
}

export async function updateQuest(
  userId: string,
  questId: string,
  draft: QuestDraft,
): Promise<ServiceResult<Quest>> {
  const supabase = getSupabaseClient();
  const rewards = getQuestRewards(draft.difficulty);

  const payload = {
    title: draft.title.trim(),
    category: draft.category,
    frequency: draft.frequency,
    specific_days: draft.frequency === "Specific Days" ? normalizeSpecificDays(draft.specific_days) : null,
    difficulty: draft.difficulty,
    xp_reward: rewards.xp,
    profile_points_reward: rewards.profilePoints,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("quests")
    .update(payload)
    .eq("id", questId)
    .eq("user_id", userId)
    .select("*")
    .single<Quest>();

  if (error) {
    return fail(mapDatabaseError(error, "Could not update quest."));
  }

  await updateConsistencyScore(userId);
  return ok(normalizeQuest(data));
}

export async function deleteQuest(userId: string, questId: string): Promise<ServiceResult<boolean>> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("quests")
    .delete()
    .eq("id", questId)
    .eq("user_id", userId);

  if (error) {
    return fail(mapDatabaseError(error, "Could not delete quest."));
  }

  await updateConsistencyScore(userId);
  return ok(true);
}

async function fallbackCompleteQuest(userId: string, questId: string): Promise<ServiceResult<Quest>> {
  const supabase = getSupabaseClient();

  const { data: questRow, error: questError } = await supabase
    .from("quests")
    .select("*")
    .eq("id", questId)
    .eq("user_id", userId)
    .single<Quest>();

  if (questError || !questRow) {
    return fail(mapDatabaseError(questError, "Quest not found."));
  }

  const quest = normalizeQuest(questRow);
  const todayDate = getIstDateString();
  const todayCode = getIstWeekdayCode();

  if (!shouldQuestBeScheduledToday(quest, todayCode)) {
    return fail("This quest is not scheduled for today.");
  }

  if (isQuestCompletedForToday(quest, todayDate)) {
    return fail("Quest is already completed for this period.");
  }

  const nextCompletedDates = dedupeDates([...quest.completed_dates, todayDate]);

  const { data: updatedQuest, error: updateQuestError } = await supabase
    .from("quests")
    .update({
      completed_dates: nextCompletedDates,
      is_completed_today: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questId)
    .eq("user_id", userId)
    .select("*")
    .single<Quest>();

  if (updateQuestError || !updatedQuest) {
    return fail(mapDatabaseError(updateQuestError, "Could not mark quest complete."));
  }

  const { data: currentUser, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single<AppUser>();

  if (userError || !currentUser) {
    return fail(mapDatabaseError(userError, "Could not update user progression."));
  }

  const nextProfilePoints = currentUser.profile_points + quest.profile_points_reward;
  const nextTotalXp = currentUser.total_xp + quest.xp_reward;
  const nextTier = resolveTier(nextProfilePoints);

  const { error: updateUserError } = await supabase
    .from("users")
    .update({
      profile_points: nextProfilePoints,
      total_xp: nextTotalXp,
      tier: nextTier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateUserError) {
    return fail(mapDatabaseError(updateUserError, "Could not update XP progression."));
  }

  await updateConsistencyScore(userId);
  return ok(normalizeQuest(updatedQuest));
}

export async function completeQuest(
  userId: string,
  questId: string,
): Promise<ServiceResult<Quest>> {
  const supabase = getSupabaseClient();

  const rpcResult = await supabase.rpc("complete_quest", {
    p_quest_id: questId,
  });

  if (!rpcResult.error) {
    const { data, error } = await supabase
      .from("quests")
      .select("*")
      .eq("id", questId)
      .eq("user_id", userId)
      .single<Quest>();

    if (error || !data) {
      return fail(mapDatabaseError(error, "Quest was completed, but could not refresh data."));
    }

    await updateConsistencyScore(userId);
    return ok(normalizeQuest(data));
  }

  // If the RPC is unavailable, use client-side fallback.
  const rpcCode = rpcResult.error.code;
  if (rpcCode === "42883" || rpcCode === "PGRST202") {
    return fallbackCompleteQuest(userId, questId);
  }

  return fail(mapDatabaseError(rpcResult.error, "Could not mark quest complete."));
}

export function getQuestDraftFromQuest(quest: Quest): QuestDraft {
  return {
    title: quest.title,
    category: quest.category,
    frequency: quest.frequency,
    specific_days: quest.specific_days,
    difficulty: quest.difficulty,
  };
}

export type { QuestDraft };
