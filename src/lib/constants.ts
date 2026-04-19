import type {
  DifficultyReward,
  QuestCategory,
  QuestDifficulty,
  QuestFrequency,
  Tier,
} from "@/types/domain";

export const IST_TIME_ZONE = "Asia/Kolkata";

export const QUEST_CATEGORIES: QuestCategory[] = [
  "Health",
  "Knowledge",
  "Focus Block",
  "Mindfulness",
  "Fitness",
];

export const QUEST_FREQUENCIES: QuestFrequency[] = [
  "Daily",
  "Weekly",
  "Specific Days",
];

export const QUEST_DIFFICULTIES: QuestDifficulty[] = ["Easy", "Medium", "Hard"];

export const WEEKDAY_CODES = ["M", "T", "W", "T", "F", "S", "S"] as const;

export const WEEKDAY_UNIQUE_CODES = ["M", "Tu", "W", "Th", "F", "Sa", "Su"] as const;

export const DIFFICULTY_REWARDS: Record<QuestDifficulty, DifficultyReward> = {
  Easy: { xp: 20, profilePoints: 5 },
  Medium: { xp: 50, profilePoints: 12 },
  Hard: { xp: 100, profilePoints: 25 },
};

export const TIERS: Tier[] = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

export const TIER_THRESHOLDS: Record<Tier, { min: number; next: number | null }> = {
  Bronze: { min: 0, next: 500 },
  Silver: { min: 500, next: 1000 },
  Gold: { min: 1000, next: 1500 },
  Platinum: { min: 1500, next: 2000 },
  Diamond: { min: 2000, next: null },
};

export const TIER_COLORS: Record<Tier, string> = {
  Bronze: "#CD7F32",
  Silver: "#C0C0C0",
  Gold: "#FFD700",
  Platinum: "#E5E4E2",
  Diamond: "#B9F2FF",
};

export const INVITATION_CODE_LENGTH = 10;

export const INVITATION_EXPIRY_DAYS = 30;

export const LOCAL_STORAGE_PENDING_INVITE_KEY = "betterme_pending_invite_code";

export const LEADERBOARD_PAGE_SIZE = 20;
