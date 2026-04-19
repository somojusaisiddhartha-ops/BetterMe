"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { LEADERBOARD_PAGE_SIZE, TIERS, TIER_COLORS } from "@/lib/constants";
import { getLeaderboard, getUserRank, type LeaderboardEntry } from "@/lib/services/leaderboard";
import { getSupabaseClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

type TierFilter = "All" | (typeof TIERS)[number];

function ArenaContent() {
  const { profile } = useAuth();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>("All");
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  const fetchPage = useCallback(async (nextPage: number, reset = false) => {
    setIsLoading(true);
    setErrorMessage(null);

    const leaderboardResult = await getLeaderboard(nextPage, LEADERBOARD_PAGE_SIZE, tierFilter);
    const leaderboardData = leaderboardResult.data;

    if (leaderboardResult.error || !leaderboardData) {
      setErrorMessage(leaderboardResult.error ?? "Could not load leaderboard.");
      setIsLoading(false);
      return;
    }

    setEntries((prev) => (reset ? leaderboardData.entries : [...prev, ...leaderboardData.entries]));
    setHasMore(leaderboardData.hasMore);
    setIsLoading(false);
  }, [tierFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(0, true);
  }, [fetchPage]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    void getUserRank(profile).then((result) => {
      if (result.data) {
        setCurrentUserRank(result.data);
      }
    });
  }, [profile]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("arena-leaderboard-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => {
          void fetchPage(0, true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchPage]);

  return (
    <AppShell pageTitle="Arena" pageSubtitle="Global leaderboard and rank progression">
      <div className={styles.filters}>
        <span>Rank Filter:</span>
        <button type="button" className={styles.activeFilter}>
          All-time
        </button>
        {(["All", ...TIERS] as TierFilter[]).map((tier) => (
          <button
            key={tier}
            type="button"
            className={tierFilter === tier ? styles.activeFilter : ""}
            onClick={() => setTierFilter(tier)}
          >
            {tier}
          </button>
        ))}
      </div>

      {profile ? (
        <article className={styles.currentUserCard}>
          <p>Current Rank</p>
          <h2>#{currentUserRank ?? "-"}</h2>
          <div>
            <strong>{profile.full_name?.trim() || profile.email.split("@")[0]}</strong>
            <span style={{ color: TIER_COLORS[profile.tier] }}>{profile.tier}</span>
            <small>{profile.total_xp.toLocaleString()} XP</small>
          </div>
        </article>
      ) : null}

      <section className={styles.list}>
        {entries.map((entry) => {
          const isCurrentUser = profile?.id === entry.user.id;

          return (
            <article
              key={`${entry.rank}-${entry.user.id}`}
              className={`${styles.row} ${isCurrentUser ? styles.currentUserRow : ""}`}
            >
              <span className={styles.rank}>#{entry.rank}</span>
              <div className={styles.arenaAvatar}>
                {(entry.user.full_name?.trim() || entry.user.email.split("@")[0]).charAt(0).toUpperCase()}
              </div>
              <div className={styles.userMeta}>
                <strong>{entry.user.full_name?.trim() || entry.user.email.split("@")[0]}</strong>
                <small style={{ color: TIER_COLORS[entry.user.tier] }}>{entry.user.tier}</small>
              </div>
              <p>{entry.user.total_xp.toLocaleString()} XP</p>
            </article>
          );
        })}
      </section>

      {hasMore ? (
        <button
          type="button"
          className={styles.loadMore}
          onClick={async () => {
            const nextPage = Math.floor(entries.length / LEADERBOARD_PAGE_SIZE);
            await fetchPage(nextPage);
          }}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load More"}
        </button>
      ) : null}

      {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}
    </AppShell>
  );
}

export default function ArenaPage() {
  return (
    <ProtectedRoute>
      <ArenaContent />
    </ProtectedRoute>
  );
}
