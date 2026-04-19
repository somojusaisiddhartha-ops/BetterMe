"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import QuestModal from "@/components/quests/QuestModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { getIstGreeting, getIstWeekDates } from "@/lib/time";
import { getTierProgress } from "@/lib/progression";
import { TIER_COLORS, WEEKDAY_CODES } from "@/lib/constants";
import { createQuest, getTodayQuestBuckets, listUserQuests, completeQuest } from "@/lib/services/quests";
import { getLeaderboard } from "@/lib/services/leaderboard";
import {
  consumePendingInvitationCode,
  redeemInvitation,
} from "@/lib/services/invitations";
import type { Quest } from "@/types/domain";
import styles from "./page.module.css";

function buildWeeklyBarData(quests: Quest[]) {
  const weekDates = getIstWeekDates();
  const completionCounts = weekDates.map((date) => {
    return quests.reduce((count, quest) => {
      return count + (quest.completed_dates.includes(date) ? 1 : 0);
    }, 0);
  });

  const maxCount = Math.max(1, ...completionCounts);

  return completionCounts.map((count, index) => ({
    key: weekDates[index],
    day: WEEKDAY_CODES[index],
    percent: Math.round((count / maxCount) * 100),
  }));
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();

  const [greeting, setGreeting] = useState(() => getIstGreeting());
  const [pendingQuests, setPendingQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [totalDueQuests, setTotalDueQuests] = useState(0);
  const [weeklyBars, setWeeklyBars] = useState<Array<{ key: string; day: string; percent: number }>>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ rank: number; userName: string; xp: number; tier: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [isSavingQuest, setIsSavingQuest] = useState(false);
  const [isCompletingQuest, setIsCompletingQuest] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);

  const tierProgress = useMemo(() => {
    return getTierProgress(profile?.profile_points ?? 0);
  }, [profile?.profile_points]);

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "there";

  const refreshDashboard = useCallback(async () => {
    if (!user) {
      return;
    }

    const [todayResult, allQuestsResult, leaderboardResult] = await Promise.all([
      getTodayQuestBuckets(user.id),
      listUserQuests(user.id),
      getLeaderboard(0, 4),
    ]);

    if (todayResult.error) {
      setErrorMessage(todayResult.error);
    } else if (todayResult.data) {
      setPendingQuests(todayResult.data.pending);
      setCompletedQuests(todayResult.data.completed);
      setTotalDueQuests(todayResult.data.totalDue);
    }

    if (allQuestsResult.error) {
      setErrorMessage(allQuestsResult.error);
    } else if (allQuestsResult.data) {
      setWeeklyBars(buildWeeklyBarData(allQuestsResult.data));
    }

    if (leaderboardResult.error) {
      setErrorMessage(leaderboardResult.error);
    } else if (leaderboardResult.data) {
      setLeaderboard(
        leaderboardResult.data.entries.map((entry) => ({
          rank: entry.rank,
          userName: entry.user.full_name?.trim() || entry.user.email.split("@")[0],
          xp: entry.user.total_xp,
          tier: entry.user.tier,
        })),
      );
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      await refreshDashboard();
      await refreshProfile();

      if (active) {
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [refreshDashboard, refreshProfile, user]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setGreeting(getIstGreeting());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const inviteCodeFromUrl = searchParams.get("invite");
    const inviteCodeFromStorage = consumePendingInvitationCode();
    const code = inviteCodeFromUrl ?? inviteCodeFromStorage;

    if (!code) {
      return;
    }

    void redeemInvitation(code, user.id, user.email).then((result) => {
      if (result.error) {
        setInviteInfo(result.error);
      } else {
        setInviteInfo("Invitation redeemed successfully.");
        void refreshProfile();
      }
    });
  }, [searchParams, user, refreshProfile]);

  const handleCompleteQuest = async (questId: string) => {
    if (!user) {
      return;
    }

    setErrorMessage(null);
    setIsCompletingQuest(questId);

    const completionResult = await completeQuest(user.id, questId);

    if (completionResult.error) {
      setErrorMessage(completionResult.error);
      setIsCompletingQuest(null);
      return;
    }

    await refreshDashboard();
    await refreshProfile();
    setIsCompletingQuest(null);
  };

  const handleCreateQuest = async (draft: {
    title: string;
    category: Quest["category"];
    frequency: Quest["frequency"];
    specific_days: string[] | null;
    difficulty: Quest["difficulty"];
  }) => {
    if (!user) {
      return;
    }

    setIsSavingQuest(true);
    setErrorMessage(null);

    const result = await createQuest(user.id, draft);

    if (result.error) {
      setErrorMessage(result.error);
      setIsSavingQuest(false);
      return;
    }

    setIsQuestModalOpen(false);
    await refreshDashboard();
    await refreshProfile();
    setIsSavingQuest(false);
  };

  return (
    <AppShell
      rightAction={
        <button
          type="button"
          className={styles.newQuestButton}
          onClick={() => setIsQuestModalOpen(true)}
        >
          + New Quest
        </button>
      }
    >
      <div className={styles.grid}>
        <section className={styles.leftColumn}>
          <article className={styles.welcomeCard}>
            <h2>
              {greeting},
              <br />
              <span>{displayName}.</span>
            </h2>
          </article>

          <article className={styles.questSection}>
            <div className={styles.sectionHeader}>
              <h3>Today&apos;s Quests</h3>
              <span>
                {completedQuests.length}/{totalDueQuests} Completed
              </span>
            </div>

            <div className={styles.questList}>
              {pendingQuests.map((quest) => (
                <article key={quest.id} className={styles.questCard}>
                  <button
                    type="button"
                    className={styles.checkButton}
                    onClick={() => handleCompleteQuest(quest.id)}
                    disabled={isCompletingQuest === quest.id}
                    aria-label={`Complete ${quest.title}`}
                  />
                  <div className={styles.questBody}>
                    <h4>{quest.title}</h4>
                    <p>{quest.category}</p>
                  </div>
                  <span className={styles.xpBadge}>+{quest.xp_reward} XP</span>
                </article>
              ))}
            </div>

            <div className={styles.completedBlock}>
              <h4>Completed Today</h4>
              {completedQuests.length === 0 ? (
                <p className={styles.emptyText}>No quests completed yet.</p>
              ) : (
                <div className={styles.questList}>
                  {completedQuests.map((quest) => (
                    <article key={quest.id} className={`${styles.questCard} ${styles.completedQuest}`}>
                      <span className={styles.completedMark}>✓</span>
                      <div className={styles.questBody}>
                        <h4>{quest.title}</h4>
                        <p>{quest.category}</p>
                      </div>
                      <span className={styles.xpBadge}>+{quest.xp_reward} XP</span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </article>
        </section>

        <section className={styles.rightColumn}>
          <article className={styles.tierCard}>
            <div className={styles.tierCardTop}>
              <div className={styles.tierIconWrap}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 8-1.5-5 5 2 3.5-4 3.5 4 5-2L19 8" />
                  <path d="M5 8c0 5 3 8 7 9 4-1 7-4 7-9" />
                  <path d="M9 17v3" />
                  <path d="M15 17v3" />
                  <path d="M8 20h8" />
                </svg>
              </div>
              <div>
                <p className={styles.tierName} style={{ color: TIER_COLORS[tierProgress.currentTier] }}>
                  {tierProgress.currentTier} Tier
                </p>
                <p className={styles.pointsText}>{profile?.profile_points ?? 0} LP</p>
              </div>
            </div>
            <div className={styles.progressGroup}>
              <div className={styles.progressMeta}>
                <span>Progress</span>
                <span>{tierProgress.nextTier ?? "Max Tier"}</span>
              </div>
              <div className={styles.progressTrack}>
                <span style={{ width: `${tierProgress.progressPercent}%` }} />
              </div>
            </div>
          </article>

          <article className={styles.consistencyCard}>
            <h3>Consistency</h3>
            <div className={styles.barChart}>
              {weeklyBars.map((bar) => (
                <div key={bar.key} className={styles.barColumn}>
                  <span style={{ height: `${Math.max(bar.percent, 8)}%` }} />
                  <small>{bar.day}</small>
                </div>
              ))}
            </div>
            <p>{profile?.consistency_score ?? 0}% this week</p>
          </article>

          <article className={styles.arenaCard}>
            <div className={styles.sectionHeader}>
              <h3>Arena</h3>
              <a href="/arena">VIEW ALL</a>
            </div>
            <ul>
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.userName === displayName;
                const initials = entry.userName.charAt(0).toUpperCase();

                return (
                  <li key={`${entry.rank}-${entry.userName}`} className={isCurrentUser ? styles.currentUserRow : ""}>
                    <span className={styles.arenaRank}>{entry.rank}</span>
                    <div className={styles.arenaAvatar}>{initials}</div>
                    <div className={styles.arenaUserInfo}>
                      <p>{entry.userName}</p>
                      <small>{entry.tier}</small>
                    </div>
                    <strong>{entry.xp.toLocaleString()}</strong>
                  </li>
                );
              })}
            </ul>
          </article>
        </section>
      </div>

      {isLoading ? <p className={styles.infoText}>Loading dashboard...</p> : null}
      {inviteInfo ? <p className={styles.infoText}>{inviteInfo}</p> : null}
      {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}

      {isQuestModalOpen ? (
        <QuestModal
          title="Create Quest"
          isSaving={isSavingQuest}
          onClose={() => setIsQuestModalOpen(false)}
          onSave={handleCreateQuest}
        />
      ) : null}
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
