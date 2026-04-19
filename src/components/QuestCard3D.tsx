"use client";

import { useRef } from "react";
import styles from "@/app/page.module.css";

type Quest = {
  title: string;
  status: "Completed" | "Pending";
  done: boolean;
};

type QuestCard3DProps = {
  className?: string;
};

const quests: Quest[] = [
  { title: "Morning Meditation", status: "Completed", done: true },
  { title: "Read for 30 mins", status: "Completed", done: true },
  { title: "Exercise", status: "Pending", done: false },
];

const MAX_TILT = 10;

function resetTilt(card: HTMLElement | null) {
  if (!card) {
    return;
  }

  card.style.setProperty("--rotate-x", "0deg");
  card.style.setProperty("--rotate-y", "0deg");
  card.style.setProperty("--glow-x", "50%");
  card.style.setProperty("--glow-y", "50%");
}

export default function QuestCard3D({ className }: QuestCard3DProps) {
  const cardRef = useRef<HTMLElement | null>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") {
      return;
    }

    const card = cardRef.current;
    if (!card) {
      return;
    }

    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    const rotateY = (x - 0.5) * (MAX_TILT * 2);
    const rotateX = (0.5 - y) * (MAX_TILT * 2);

    card.style.setProperty("--rotate-x", `${rotateX.toFixed(2)}deg`);
    card.style.setProperty("--rotate-y", `${rotateY.toFixed(2)}deg`);
    card.style.setProperty("--glow-x", `${(x * 100).toFixed(2)}%`);
    card.style.setProperty("--glow-y", `${(y * 100).toFixed(2)}%`);
  };

  const handlePointerLeave = () => {
    resetTilt(cardRef.current);
  };

  return (
    <article
      ref={cardRef}
      className={`${styles.questCard} ${styles.questCard3d} ${className ?? ""}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
    >
      <div className={styles.questHeader}>
        <h3>Today&apos;s Quests</h3>
        <span>67% Done</span>
      </div>

      <div className={styles.questList}>
        {quests.map((quest) => (
          <div
            key={quest.title}
            className={`${styles.questItem} ${
              quest.done ? styles.questDone : styles.questPending
            }`}
          >
            <div className={styles.questLeft}>
              <span className={styles.questIndicator}>
                {quest.done ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m7 12.5 3 3 7-7" />
                  </svg>
                ) : null}
              </span>
              <span className={styles.questTitle}>{quest.title}</span>
            </div>
            <span
              className={`${styles.questStatus} ${
                quest.done ? styles.statusDone : styles.statusPending
              }`}
            >
              {quest.status}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressHeader}>
          <span>Daily Progress</span>
          <span>67/100 XP</span>
        </div>
        <div className={styles.progressTrack}>
          <span style={{ width: "67%" }} />
        </div>
      </div>
    </article>
  );
}
