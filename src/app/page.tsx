import styles from "./page.module.css";
import QuestCard3D from "@/components/QuestCard3D";
import RevealOnView from "@/components/RevealOnView";
import type { CSSProperties } from "react";

type GlyphName =
  | "bolt"
  | "flame"
  | "trophy"
  | "badge"
  | "chart"
  | "grid"
  | "check"
  | "trend"
  | "user"
  | "target"
  | "spark"
  | "rocket"
  | "play"
  | "arrowRight";

const features = [
  {
    title: "Earn XP",
    description:
      "Gain experience points for every positive action you take throughout the day.",
    icon: "bolt" as GlyphName,
  },
  {
    title: "Build Streaks",
    description:
      "Keep the momentum going. Watch your streak grow as you stay consistent.",
    icon: "flame" as GlyphName,
  },
  {
    title: "Level Up",
    description:
      "Progress from a beginner to a master as you reach new character levels.",
    icon: "trophy" as GlyphName,
  },
  {
    title: "Achievements",
    description:
      "Unlock unique badges and rewards for hitting significant milestones.",
    icon: "badge" as GlyphName,
  },
  {
    title: "Progress Insights",
    description:
      "Deep dive into your habits with beautiful data visualizations and trends.",
    icon: "chart" as GlyphName,
  },
  {
    title: "Unified Dashboard",
    description:
      "Everything you need in one clean, minimalist view designed for focus.",
    icon: "grid" as GlyphName,
  },
];

const dashboardHighlights = [
  {
    title: "Clear Prioritization",
    body: "See your highest impact tasks at a glance and track XP growth in real-time.",
    icon: "check" as GlyphName,
  },
  {
    title: "Visual Momentum",
    body: "Progress bars and streak counters provide instant feedback on your daily growth.",
    icon: "trend" as GlyphName,
  },
  {
    title: "Personalized Focus",
    body: "Customize your quest board to match your unique life goals and daily rhythm.",
    icon: "user" as GlyphName,
  },
];

const journeySteps = [
  {
    title: "Create Quests",
    body: "Define your daily habits as quests with custom XP rewards.",
    icon: "target" as GlyphName,
  },
  {
    title: "Complete Tasks",
    body: "Perform your activities and check them off to claim your experience.",
    icon: "check" as GlyphName,
  },
  {
    title: "Track Progress",
    body: "Watch your stats grow and analyze your long-term consistency.",
    icon: "spark" as GlyphName,
  },
  {
    title: "Level Up",
    body: "Reach new levels, unlock rewards, and become the best version of yourself.",
    icon: "rocket" as GlyphName,
  },
];

function Glyph({ name }: { name: GlyphName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  switch (name) {
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="m13 2-7 10h5l-1 10 8-12h-5l0-8Z" />
        </svg>
      );
    case "flame":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            {...common}
            d="M12 2c2 3 5 4 5 9a5 5 0 1 1-10 0c0-2 1-4 3-6 0 2 1 3 2 4"
          />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="M7 4h10v3a5 5 0 0 1-10 0V4Z" />
          <path {...common} d="M12 12v5" />
          <path {...common} d="M8 21h8" />
          <path {...common} d="M7 5H4a3 3 0 0 0 3 3" />
          <path {...common} d="M17 5h3a3 3 0 0 1-3 3" />
        </svg>
      );
    case "badge":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle {...common} cx="12" cy="10" r="5" />
          <path {...common} d="m9 15-1 7 4-2 4 2-1-7" />
          <path {...common} d="m10.5 10 1 1 2-2" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="M4 20V9" />
          <path {...common} d="M10 20V4" />
          <path {...common} d="M16 20v-7" />
          <path {...common} d="M22 20H2" />
        </svg>
      );
    case "grid":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect {...common} x="4" y="4" width="7" height="7" />
          <rect {...common} x="13" y="4" width="7" height="7" />
          <rect {...common} x="4" y="13" width="7" height="7" />
          <rect {...common} x="13" y="13" width="7" height="7" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="m5 12 4 4 10-10" />
          <circle {...common} cx="12" cy="12" r="9" />
        </svg>
      );
    case "trend":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="m3 17 7-7 4 4 7-7" />
          <path {...common} d="M14 7h7v7" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle {...common} cx="12" cy="8" r="4" />
          <path {...common} d="M5 20c1.5-3 4-4.5 7-4.5S17.5 17 19 20" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle {...common} cx="12" cy="12" r="8" />
          <circle {...common} cx="12" cy="12" r="4" />
          <circle {...common} cx="12" cy="12" r="1.2" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="m8 4 1.8 3.5L13 9.2l-3.2 1.6L8 14l-1.7-3.2L3 9.2l3.3-1.7Z" />
          <path {...common} d="m17 11 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
        </svg>
      );
    case "rocket":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="M15 3c3 1 6 4 7 7-2 1-4.5 1.7-7 2l-6 6-4 1 1-4 6-6c.3-2.6 1-5 2-7Z" />
          <path {...common} d="M9 15 4 20" />
          <circle {...common} cx="16.5" cy="7.5" r="1.5" />
        </svg>
      );
    case "play":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle {...common} cx="12" cy="12" r="9" />
          <path {...common} d="m10 8 6 4-6 4Z" />
        </svg>
      );
    case "arrowRight":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path {...common} d="M5 12h14" />
          <path {...common} d="m13 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.headerWrap}>
        <div className={styles.container}>
          <div className={styles.navbar}>
            <a href="#" className={styles.brand}>
              BetterMe
            </a>
            <nav className={styles.navLinks}>
              <a href="#" className={`${styles.navLink} ${styles.activeLink}`}>
                Home
              </a>
              <a href="#features" className={styles.navLink}>
                Features
              </a>
              <a href="#dashboard" className={styles.navLink}>
                Dashboard
              </a>
            </nav>
            <div className={styles.authArea}>
              <a href="/auth/signin" className={styles.loginLink}>
                Login
              </a>
              <a href="/auth/signup" className={styles.signupButton}>
                Sign Up
              </a>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.heroSection}>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <h1>
                Level Up Your
                <br />
                Life Every Single
                <br />
                Day{" "}
                <span
                  className={styles.heroEmoji}
                  role="img"
                  aria-label="fire"
                >
                  🔥
                </span>
              </h1>
              <p>
                Turn your habits into a game. Earn XP, build streaks, and become
                unstoppable with daily consistency.
              </p>
              <div className={styles.heroActions}>
                <a href="/auth/signup" className={styles.primaryButton}>
                  Get Started Free
                  <span className={styles.buttonIcon}>
                    <Glyph name="arrowRight" />
                  </span>
                </a>
              </div>
            </div>
            <QuestCard3D />
          </div>
        </section>

        <section id="features" className={styles.featuresSection}>
          <RevealOnView className={styles.featuresReveal}>
            <div className={styles.container}>
              <h2>Powerful Gamified Features</h2>
              <span className={styles.sectionRule} />
              <div className={styles.featureGrid}>
                {features.map((feature, index) => (
                  <article
                    key={feature.title}
                    className={styles.featureCard}
                    data-reveal-card
                    style={
                      {
                        "--reveal-index": index,
                      } as CSSProperties
                    }
                  >
                    <span className={styles.featureIcon}>
                      <Glyph name={feature.icon} />
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </RevealOnView>
        </section>

        <section id="dashboard" className={styles.dashboardSection}>
          <div className={styles.container}>
              <div className={styles.dashboardShell}>
                <div className={styles.dashboardTop}>
                  <div>
                    <h2>A Dashboard Designed for Flow</h2>
                    <p>Focus on what matters without the clutter.</p>
                  </div>
                </div>

                <div className={styles.dashboardGrid}>
                <QuestCard3D className={styles.dashboardQuestCard} />
                <div className={styles.dashboardRight}>
                  {dashboardHighlights.map((highlight) => (
                    <article key={highlight.title} className={styles.highlight}>
                      <span className={styles.highlightIcon}>
                        <Glyph name={highlight.icon} />
                      </span>
                      <div>
                        <h3>{highlight.title}</h3>
                        <p>{highlight.body}</p>
                      </div>
                    </article>
                  ))}

                  <article className={styles.consistencyCard}>
                    <div className={styles.progressHeader}>
                      <span>Daily Consistency</span>
                      <span>75% Complete</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <span style={{ width: "75%" }} />
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.howSection}>
          <div className={styles.container}>
            <h2>How It Works</h2>
            <p className={styles.howSubtext}>
              Mastering your habits is a simple 4-step journey with BetterMe.
            </p>

            <div className={styles.timeline}>
              <span className={styles.timelineLine} />
              {journeySteps.map((step) => (
                <article key={step.title} className={styles.timelineStep}>
                  <span className={styles.timelineIcon}>
                    <Glyph name={step.icon} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>

            <article className={styles.ctaCard}>
              <h2>
                Start Your Level-Up Journey
                <br />
                Today
              </h2>
              <p>
                Join now and turn your life into an epic
                adventure of growth and self-improvement.
              </p>
              <div className={styles.ctaActions}>
                <a href="/auth/signup" className={styles.ctaPrimary}>
                  Get Started Free
                  <span className={styles.buttonIcon}>
                    <Glyph name="arrowRight" />
                  </span>
                </a>
                <a href="#features" className={styles.ctaSecondary}>
                  Explore Features
                </a>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
