"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildAnalyticsSnapshot } from "@/lib/services/analytics";
import { listUserQuests } from "@/lib/services/quests";
import type { AnalyticsSnapshot } from "@/types/domain";
import styles from "./page.module.css";

function AnalyticsContent() {
  const { user, profile } = useAuth();

  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) {
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const questsResult = await listUserQuests(user.id);

      if (!active) {
        return;
      }

      if (questsResult.error || !questsResult.data) {
        setErrorMessage(questsResult.error ?? "Could not load analytics data.");
        setIsLoading(false);
        return;
      }

      setSnapshot(buildAnalyticsSnapshot(profile, questsResult.data));
      setIsLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [profile, user]);

  const xpLast30Days = useMemo(() => {
    if (!snapshot) return 0;
    return snapshot.xpByLast30Days.reduce((sum, entry) => sum + entry.xp, 0);
  }, [snapshot]);

  const maxCategoryCount = useMemo(() => {
    if (!snapshot) {
      return 1;
    }

    return Math.max(1, ...snapshot.completedByCategory.map((entry) => entry.count));
  }, [snapshot]);

  return (
    <AppShell pageTitle="Your Analytics" pageSubtitle="Performance trends across quests and consistency">
      {snapshot ? (
        <>
          <section className={styles.statsGrid}>
            <article>
              <p>Total XP Earned</p>
              <h2>{snapshot.totalXpEarned.toLocaleString()}</h2>
            </article>
            <article>
              <p>XP (Last 30 Days)</p>
              <h2>{xpLast30Days.toLocaleString()}</h2>
            </article>
            <article>
              <p>Quests Completed</p>
              <h2>{snapshot.questsCompletedAllTime}</h2>
            </article>
            <article>
              <p>Current Streak</p>
              <h2>{snapshot.currentStreak} days</h2>
            </article>
            <article>
              <p>Consistency Score</p>
              <h2>{snapshot.consistencyScore}%</h2>
            </article>
            <article>
              <p>Avg Quests / Week</p>
              <h2>{snapshot.averageQuestsPerWeek}</h2>
            </article>
          </section>

          <section className={styles.bottomGrid}>
            <article className={styles.card}>
              <h3>Completed Quests by Category</h3>
              <div className={styles.categoryBars}>
                {snapshot.completedByCategory.map((entry) => (
                  <div key={entry.category}>
                    <div className={styles.categoryMeta}>
                      <span>{entry.category}</span>
                      <strong>{entry.count}</strong>
                    </div>
                    <div className={styles.categoryTrack}>
                      <span style={{ width: `${Math.max(6, (entry.count / maxCategoryCount) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.card}>
              <h3>Top Performing Quests</h3>
              <ul>
                {snapshot.topPerformingQuests.map((quest) => (
                  <li key={quest.title}>
                    <p>{quest.title}</p>
                    <small>{quest.completions} completions</small>
                    <strong>{quest.xp} XP</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      ) : null}

      {isLoading ? <p className={styles.infoText}>Loading analytics...</p> : null}
      {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}
    </AppShell>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
