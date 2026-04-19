"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import QuestModal from "@/components/quests/QuestModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { QUEST_CATEGORIES } from "@/lib/constants";
import {
  completeQuest,
  createQuest,
  deleteQuest,
  getQuestDraftFromQuest,
  listUserQuests,
  updateQuest,
} from "@/lib/services/quests";
import { getIstDateString, getIstWeekdayCode, isSameIsoWeek } from "@/lib/time";
import type { Quest, QuestCategory } from "@/types/domain";
import styles from "./page.module.css";

type StatusFilter = "All" | "Completed" | "Pending";

type CategoryFilter = "All" | QuestCategory;

function isQuestScheduledToday(quest: Quest) {
  const todayCode = getIstWeekdayCode();

  if (quest.frequency === "Daily" || quest.frequency === "Weekly") {
    return true;
  }

  if (!quest.specific_days || quest.specific_days.length === 0) {
    return false;
  }

  if (quest.specific_days.includes(todayCode)) {
    return true;
  }

  if ((todayCode === "Tu" || todayCode === "Th") && quest.specific_days.includes("T")) {
    return true;
  }

  if ((todayCode === "Sa" || todayCode === "Su") && quest.specific_days.includes("S")) {
    return true;
  }

  return false;
}

function isQuestCompletedForCurrentPeriod(quest: Quest) {
  const todayDate = getIstDateString();

  if (quest.frequency === "Weekly") {
    return quest.completed_dates.some((date) => isSameIsoWeek(date, todayDate));
  }

  return quest.completed_dates.includes(todayDate);
}

function QuestsContent() {
  const { user } = useAuth();

  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [detailQuest, setDetailQuest] = useState<Quest | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeCompletionId, setActiveCompletionId] = useState<string | null>(null);

  const refreshQuests = useCallback(async () => {
    if (!user) {
      return;
    }

    const result = await listUserQuests(user.id);

    if (result.error || !result.data) {
      setErrorMessage(result.error ?? "Could not load quests.");
      return;
    }

    setQuests(result.data);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      await refreshQuests();

      if (active) {
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [refreshQuests, user]);

  const filteredQuests = useMemo(() => {
    return quests.filter((quest) => {
      if (categoryFilter !== "All" && quest.category !== categoryFilter) {
        return false;
      }

      if (statusFilter === "All") {
        return true;
      }

      const completed = isQuestCompletedForCurrentPeriod(quest);
      if (statusFilter === "Completed") {
        return completed;
      }

      return !completed;
    });
  }, [categoryFilter, quests, statusFilter]);

  const handleCompleteQuest = async (questId: string) => {
    if (!user) {
      return;
    }

    setErrorMessage(null);
    setActiveCompletionId(questId);

    const result = await completeQuest(user.id, questId);

    if (result.error) {
      setErrorMessage(result.error);
      setActiveCompletionId(null);
      return;
    }

    await refreshQuests();
    setActiveCompletionId(null);
  };

  const handleDelete = async (questId: string) => {
    if (!user) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    const result = await deleteQuest(user.id, questId);

    if (result.error) {
      setErrorMessage(result.error);
      setIsDeleting(false);
      return;
    }

    setDetailQuest(null);
    setEditingQuest(null);
    await refreshQuests();
    setIsDeleting(false);
  };

  return (
    <AppShell
      pageTitle="My Quests"
      pageSubtitle="Create, track, and complete quests with XP rewards"
      rightAction={
        <button type="button" className={styles.newQuestButton} onClick={() => setIsCreateOpen(true)}>
          + New Quest
        </button>
      }
    >
      <section className={styles.filtersRow}>
        <div className={styles.tabs}>
          {(["All", "Completed", "Pending"] as StatusFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              className={statusFilter === value ? styles.activeTab : ""}
              onClick={() => setStatusFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>

        <div className={styles.categoryFilters}>
          {(["All", ...QUEST_CATEGORIES] as CategoryFilter[]).map((category) => (
            <button
              key={category}
              type="button"
              className={categoryFilter === category ? styles.activeCategory : ""}
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.questGrid}>
        {filteredQuests.map((quest) => {
          const completed = isQuestCompletedForCurrentPeriod(quest);
          const canComplete = isQuestScheduledToday(quest) && !completed;

          return (
            <article
              key={quest.id}
              className={`${styles.questCard} ${completed ? styles.questCompleted : ""}`}
              onClick={() => setDetailQuest(quest)}
            >
              <button
                type="button"
                className={styles.checkButton}
                disabled={!canComplete || activeCompletionId === quest.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleCompleteQuest(quest.id);
                }}
                aria-label={`Complete ${quest.title}`}
              >
                {completed ? "✓" : ""}
              </button>

              <div className={styles.questBody}>
                <h3>{quest.title}</h3>
                <p>
                  {quest.category} · {quest.frequency}
                </p>
                <small>
                  {quest.difficulty} · +{quest.xp_reward} XP
                </small>
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingQuest(quest);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const confirmed = window.confirm("Delete this quest?");
                    if (confirmed) {
                      void handleDelete(quest.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {filteredQuests.length === 0 && !isLoading ? (
        <p className={styles.infoText}>No quests found for selected filters.</p>
      ) : null}

      {isLoading ? <p className={styles.infoText}>Loading quests...</p> : null}
      {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}

      {isCreateOpen ? (
        <QuestModal
          title="Create Quest"
          isSaving={isSaving}
          onClose={() => setIsCreateOpen(false)}
          onSave={async (draft) => {
            if (!user) {
              return;
            }

            setIsSaving(true);
            setErrorMessage(null);

            const result = await createQuest(user.id, draft);
            if (result.error) {
              setErrorMessage(result.error);
              setIsSaving(false);
              return;
            }

            setIsCreateOpen(false);
            setIsSaving(false);
            await refreshQuests();
          }}
        />
      ) : null}

      {editingQuest ? (
        <QuestModal
          title="Edit Quest"
          initialValue={getQuestDraftFromQuest(editingQuest)}
          isSaving={isSaving}
          onClose={() => setEditingQuest(null)}
          onSave={async (draft) => {
            if (!user || !editingQuest) {
              return;
            }

            setIsSaving(true);
            setErrorMessage(null);

            const result = await updateQuest(user.id, editingQuest.id, draft);
            if (result.error) {
              setErrorMessage(result.error);
              setIsSaving(false);
              return;
            }

            setEditingQuest(null);
            setIsSaving(false);
            await refreshQuests();
          }}
        />
      ) : null}

      {detailQuest ? (
        <div className={styles.detailOverlay} role="dialog" aria-modal="true" aria-label="Quest details">
          <div className={styles.detailCard}>
            <div className={styles.detailTop}>
              <h3>{detailQuest.title}</h3>
              <button type="button" onClick={() => setDetailQuest(null)}>
                ×
              </button>
            </div>

            <p>
              <strong>Category:</strong> {detailQuest.category}
            </p>
            <p>
              <strong>Frequency:</strong> {detailQuest.frequency}
            </p>
            <p>
              <strong>Difficulty:</strong> {detailQuest.difficulty}
            </p>
            <p>
              <strong>Reward:</strong> +{detailQuest.xp_reward} XP · +{detailQuest.profile_points_reward} PP
            </p>

            <h4>Completion History</h4>
            {detailQuest.completed_dates.length === 0 ? (
              <p className={styles.infoText}>No completions yet.</p>
            ) : (
              <ul>
                {detailQuest.completed_dates
                  .slice()
                  .sort((left, right) => right.localeCompare(left))
                  .map((date) => (
                    <li key={date}>{date}</li>
                  ))}
              </ul>
            )}

            <div className={styles.detailActions}>
              <button
                type="button"
                onClick={() => {
                  setEditingQuest(detailQuest);
                  setDetailQuest(null);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm("Delete this quest?");
                  if (confirmed) {
                    void handleDelete(detailQuest.id);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function QuestsPage() {
  return (
    <ProtectedRoute>
      <QuestsContent />
    </ProtectedRoute>
  );
}
