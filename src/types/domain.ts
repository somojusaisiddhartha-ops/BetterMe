export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type QuestCategory =
  | "Health"
  | "Knowledge"
  | "Focus Block"
  | "Mindfulness"
  | "Fitness";

export type QuestFrequency = "Daily" | "Weekly" | "Specific Days";

export type QuestDifficulty = "Easy" | "Medium" | "Hard";

export type FriendStatus = "pending" | "accepted";

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tier: Tier;
  total_xp: number;
  profile_points: number;
  consistency_score: number;
  created_at: string;
  updated_at: string;
  is_invited: boolean;
  invited_by_user_id: string | null;
}

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  category: QuestCategory;
  frequency: QuestFrequency;
  specific_days: string[] | null;
  difficulty: QuestDifficulty;
  xp_reward: number;
  profile_points_reward: number;
  is_completed_today: boolean;
  completed_dates: string[];
  created_at: string;
  updated_at: string;
}

export interface FriendRelationship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  invitation_code: string;
  invited_email: string;
  invited_by_user_id: string;
  invited_by_username: string;
  is_used: boolean;
  created_at: string;
  expires_at: string;
  redeemed_by_user_id: string | null;
}

export interface DifficultyReward {
  xp: number;
  profilePoints: number;
}

export interface TierProgress {
  currentTier: Tier;
  nextTier: Tier | null;
  currentPoints: number;
  currentTierFloor: number;
  nextTierThreshold: number | null;
  progressPercent: number;
  pointsToNextTier: number;
}

export interface TodayQuestBuckets {
  pending: Quest[];
  completed: Quest[];
  totalDue: number;
}

export interface FriendRequestView {
  relationshipId: string;
  user: AppUser;
  status: FriendStatus;
  direction: "incoming" | "outgoing";
}

export interface FriendsSnapshot {
  incomingRequests: FriendRequestView[];
  outgoingRequests: FriendRequestView[];
  acceptedFriends: AppUser[];
}

export interface AnalyticsSnapshot {
  totalXpEarned: number;
  questsCompletedAllTime: number;
  currentStreak: number;
  consistencyScore: number;
  averageQuestsPerWeek: number;
  xpByLast30Days: Array<{ date: string; xp: number }>;
  completedByCategory: Array<{ category: QuestCategory; count: number }>;
  weeklyHeatmap: Array<{ day: string; completions: number }>;
  topPerformingQuests: Array<{ title: string; completions: number; xp: number }>;
}
