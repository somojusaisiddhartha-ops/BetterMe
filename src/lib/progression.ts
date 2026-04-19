import { TIERS, TIER_THRESHOLDS } from "@/lib/constants";
import type { Tier, TierProgress } from "@/types/domain";

export function resolveTier(profilePoints: number): Tier {
  if (profilePoints >= 2000) {
    return "Diamond";
  }

  if (profilePoints >= 1500) {
    return "Platinum";
  }

  if (profilePoints >= 1000) {
    return "Gold";
  }

  if (profilePoints >= 500) {
    return "Silver";
  }

  return "Bronze";
}

export function getTierProgress(profilePoints: number): TierProgress {
  const currentTier = resolveTier(profilePoints);
  const { min, next } = TIER_THRESHOLDS[currentTier];

  if (!next) {
    return {
      currentTier,
      nextTier: null,
      currentPoints: profilePoints,
      currentTierFloor: min,
      nextTierThreshold: null,
      progressPercent: 100,
      pointsToNextTier: 0,
    };
  }

  const inTierPoints = Math.max(profilePoints - min, 0);
  const tierSpan = next - min;
  const progressPercent = Math.min(Math.round((inTierPoints / tierSpan) * 100), 100);

  return {
    currentTier,
    nextTier: TIERS[TIERS.indexOf(currentTier) + 1] ?? null,
    currentPoints: profilePoints,
    currentTierFloor: min,
    nextTierThreshold: next,
    progressPercent,
    pointsToNextTier: Math.max(next - profilePoints, 0),
  };
}
