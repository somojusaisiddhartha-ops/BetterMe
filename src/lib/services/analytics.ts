import { QUEST_CATEGORIES } from "@/lib/constants";
import { getLastNDatesInIst, getIstDateString } from "@/lib/time";
import type { AnalyticsSnapshot, AppUser, Quest, QuestCategory } from "@/types/domain";

function computeCurrentStreak(completedDatesSet: Set<string>) {
  let streak = 0;
  const today = new Date(`${getIstDateString()}T00:00:00.000Z`);

  while (true) {
    const cursor = new Date(today);
    cursor.setUTCDate(today.getUTCDate() - streak);
    const isoDate = cursor.toISOString().slice(0, 10);

    if (!completedDatesSet.has(isoDate)) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function getWeeksSince(dateString: string) {
  const createdAt = new Date(dateString).getTime();
  const now = Date.now();
  const msInWeek = 7 * 24 * 60 * 60 * 1000;

  return Math.max(1, Math.ceil((now - createdAt) / msInWeek));
}

export function buildAnalyticsSnapshot(user: AppUser, quests: Quest[]): AnalyticsSnapshot {
  const allCompletions: string[] = [];
  const completedByCategoryMap = new Map<QuestCategory, number>(
    QUEST_CATEGORIES.map((category) => [category, 0]),
  );

  const topPerformingQuests = quests
    .map((quest) => {
      const completionCount = quest.completed_dates.length;
      allCompletions.push(...quest.completed_dates);
      completedByCategoryMap.set(
        quest.category,
        (completedByCategoryMap.get(quest.category) ?? 0) + completionCount,
      );

      return {
        title: quest.title,
        completions: completionCount,
        xp: completionCount * quest.xp_reward,
      };
    })
    .sort((left, right) => {
      if (right.completions !== left.completions) {
        return right.completions - left.completions;
      }

      return right.xp - left.xp;
    })
    .slice(0, 5);

  const completionSet = new Set(allCompletions);
  const currentStreak = computeCurrentStreak(completionSet);

  const days30 = getLastNDatesInIst(30);
  const xpByDateMap = new Map<string, number>(days30.map((date) => [date, 0]));

  quests.forEach((quest) => {
    quest.completed_dates.forEach((date) => {
      if (!xpByDateMap.has(date)) {
        return;
      }

      xpByDateMap.set(date, (xpByDateMap.get(date) ?? 0) + quest.xp_reward);
    });
  });

  const days7 = getLastNDatesInIst(7);
  const weeklyHeatmap = days7.map((date) => {
    let completions = 0;

    quests.forEach((quest) => {
      if (quest.completed_dates.includes(date)) {
        completions += 1;
      }
    });

    const weekdayLabel = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(`${date}T00:00:00.000Z`));

    return {
      day: weekdayLabel,
      completions,
    };
  });

  const questsCompletedAllTime = allCompletions.length;
  const weeksSinceJoin = getWeeksSince(user.created_at);

  return {
    totalXpEarned: user.total_xp,
    questsCompletedAllTime,
    currentStreak,
    consistencyScore: user.consistency_score,
    averageQuestsPerWeek: Number((questsCompletedAllTime / weeksSinceJoin).toFixed(1)),
    xpByLast30Days: days30.map((date) => ({ date, xp: xpByDateMap.get(date) ?? 0 })),
    completedByCategory: QUEST_CATEGORIES.map((category) => ({
      category,
      count: completedByCategoryMap.get(category) ?? 0,
    })),
    weeklyHeatmap,
    topPerformingQuests,
  };
}
