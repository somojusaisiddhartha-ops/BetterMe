"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  DIFFICULTY_REWARDS,
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_FREQUENCIES,
  WEEKDAY_UNIQUE_CODES,
} from "@/lib/constants";
import type { QuestCategory, QuestDifficulty, QuestFrequency } from "@/types/domain";
import type { QuestDraft } from "@/lib/services/quests";
import styles from "./QuestModal.module.css";

type QuestModalProps = {
  title: string;
  initialValue?: QuestDraft;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (draft: QuestDraft) => Promise<void>;
};

const defaultDraft: QuestDraft = {
  title: "",
  category: "Health",
  frequency: "Daily",
  specific_days: null,
  difficulty: "Medium",
};

const PRESET_CATEGORIES = QUEST_CATEGORIES;

export default function QuestModal({
  title,
  initialValue,
  isSaving = false,
  onClose,
  onSave,
}: QuestModalProps) {
  // Detect if initial value has a custom (non-preset) category
  const initialIsCustom = initialValue
    ? !PRESET_CATEGORIES.includes(initialValue.category)
    : false;

  const [draft, setDraft] = useState<QuestDraft>(initialValue ?? defaultDraft);
  const [isCustomCategory, setIsCustomCategory] = useState(initialIsCustom);
  const [customCategoryText, setCustomCategoryText] = useState(
    initialIsCustom ? (initialValue?.category ?? "") : ""
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedRewards = useMemo(() => {
    return DIFFICULTY_REWARDS[draft.difficulty];
  }, [draft.difficulty]);

  const toggleSpecificDay = (dayCode: string) => {
    const existingDays = draft.specific_days ?? [];

    if (existingDays.includes(dayCode)) {
      const nextDays = existingDays.filter((entry) => entry !== dayCode);
      setDraft((prev) => ({
        ...prev,
        specific_days: nextDays.length > 0 ? nextDays : null,
      }));
      return;
    }

    setDraft((prev) => ({
      ...prev,
      specific_days: [...existingDays, dayCode],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const titleText = draft.title.trim();

    if (!titleText) {
      setErrorMessage("Quest title is required.");
      return;
    }

    if (isCustomCategory && !customCategoryText.trim()) {
      setErrorMessage("Please enter a custom category name.");
      return;
    }

    if (draft.frequency === "Specific Days" && (!draft.specific_days || draft.specific_days.length === 0)) {
      setErrorMessage("Select at least one day for specific day quests.");
      return;
    }

    const finalCategory = isCustomCategory
      ? (customCategoryText.trim() as QuestCategory)
      : draft.category;

    await onSave({
      ...draft,
      title: titleText,
      category: finalCategory,
      specific_days: draft.frequency === "Specific Days" ? draft.specific_days : null,
    });
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Quest Editor">
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.topRow}>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.leftColumn}>
            <label className={styles.label}>
              Quest Title
              <input
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Deep Work (2hr)"
                minLength={2}
                maxLength={100}
                required
                disabled={isSaving}
              />
            </label>

            <div className={styles.section}>
              <p>Category</p>
              <div className={styles.optionGrid}>
                {PRESET_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={!isCustomCategory && draft.category === category ? styles.optionActive : ""}
                    onClick={() => {
                      setIsCustomCategory(false);
                      setDraft((prev) => ({
                        ...prev,
                        category: category as QuestCategory,
                      }));
                    }}
                    disabled={isSaving}
                  >
                    {category}
                  </button>
                ))}
                <button
                  type="button"
                  className={isCustomCategory ? styles.optionActive : ""}
                  onClick={() => {
                    setIsCustomCategory(true);
                  }}
                  disabled={isSaving}
                >
                  + Custom
                </button>
              </div>
              {isCustomCategory && (
                <input
                  className={styles.customCategoryInput}
                  value={customCategoryText}
                  onChange={(e) => setCustomCategoryText(e.target.value)}
                  placeholder="e.g. Creative, Finance, Social…"
                  maxLength={40}
                  disabled={isSaving}
                  autoFocus
                />
              )}
            </div>

            <div className={styles.section}>
              <p>Frequency</p>
              <div className={styles.optionGrid}>
                {QUEST_FREQUENCIES.map((frequency) => (
                  <button
                    key={frequency}
                    type="button"
                    className={draft.frequency === frequency ? styles.optionActive : ""}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        frequency: frequency as QuestFrequency,
                        specific_days: frequency === "Specific Days" ? prev.specific_days : null,
                      }))
                    }
                    disabled={isSaving}
                  >
                    {frequency}
                  </button>
                ))}
              </div>
            </div>

            {draft.frequency === "Specific Days" ? (
              <div className={styles.section}>
                <p>Specific Days</p>
                <div className={styles.dayGrid}>
                  {WEEKDAY_UNIQUE_CODES.map((dayCode) => {
                    const selected = draft.specific_days?.includes(dayCode) ?? false;

                    return (
                      <button
                        key={dayCode}
                        type="button"
                        className={selected ? styles.dayActive : ""}
                        onClick={() => toggleSpecificDay(dayCode)}
                        disabled={isSaving}
                      >
                        {dayCode}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <aside className={styles.stakesPanel}>
            <h3>Quest Stakes</h3>
            <p>Difficulty Level</p>

            <div className={styles.difficultyOptions}>
              {QUEST_DIFFICULTIES.map((difficulty) => {
                const rewards = DIFFICULTY_REWARDS[difficulty];

                return (
                  <button
                    key={difficulty}
                    type="button"
                    className={draft.difficulty === difficulty ? styles.difficultyActive : ""}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        difficulty: difficulty as QuestDifficulty,
                      }))
                    }
                    disabled={isSaving}
                  >
                    <span>{difficulty}</span>
                    <small>
                      {rewards.xp} XP · {rewards.profilePoints} PP
                    </small>
                  </button>
                );
              })}
            </div>

            <div className={styles.rewardBox}>
              <h4>Selected Rewards</h4>
              <p>XP: +{selectedRewards.xp}</p>
              <p>Profile Points: +{selectedRewards.profilePoints}</p>
            </div>
          </aside>
        </div>

        {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}

        <div className={styles.footerRow}>
          <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Quest"}
          </button>
        </div>
      </form>
    </div>
  );
}
