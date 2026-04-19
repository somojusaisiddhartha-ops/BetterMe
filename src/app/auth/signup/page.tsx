"use client";

import GuestRoute from "@/components/auth/GuestRoute";
import AuthForm from "@/components/auth/AuthForm";
import styles from "@/app/auth/auth-page.module.css";

const features = [
  {
    icon: "⚡",
    title: "Earn XP",
    description: "Gamify your daily habits and see your character grow.",
  },
  {
    icon: "🔥",
    title: "Build Streaks",
    description: "Consistency is king. Protect your flame and momentum.",
  },
  {
    icon: "🏆",
    title: "Level Up",
    description: "Unlock new tiers and badges as you hit milestones.",
  },
  {
    icon: "📊",
    title: "Dashboard Access",
    description: "Everything you need in one powerful visual center.",
  },
];

export default function SignUpPage() {
  return (
    <GuestRoute>
      <main className={styles.signupPage}>
        <div className={styles.signupShell}>
          <AuthForm mode="signup" />

          <section className={styles.featuresPanel}>
            <h2 className={styles.featuresPanelTitle}>What&apos;s Included in Your Account:</h2>
            <div className={styles.featuresGrid}>
              {features.map((f) => (
                <div key={f.title} className={styles.featureCard}>
                  <div className={styles.featureIcon}>{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </GuestRoute>
  );
}
