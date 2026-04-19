import Link from "next/link";
import styles from "./ResourcePage.module.css";

type ResourceSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type ResourceLink = {
  href: string;
  label: string;
};

type ResourcePageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updatedLabel: string;
  sections: ResourceSection[];
  sidebarTitle: string;
  sidebarText: string;
  quickLinks: ResourceLink[];
  note?: string;
};

export default function ResourcePage({
  eyebrow,
  title,
  intro,
  updatedLabel,
  sections,
  sidebarTitle,
  sidebarText,
  quickLinks,
  note,
}: ResourcePageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          BetterMe
        </Link>

        <nav className={styles.nav}>
          <Link href="/auth/signin" className={styles.navLink}>
            Sign In
          </Link>
          <Link href="/auth/signup" className={styles.navButton}>
            Create Account
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className={styles.metaRow}>
          <span className={styles.metaPill}>{updatedLabel}</span>
          <Link href="/" className={styles.inlineLink}>
            Back to home
          </Link>
        </div>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.article}>
          {sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <h2>{section.title}</h2>

              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {section.bullets ? (
                <ul className={styles.bulletList}>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <span className={styles.sidebarLabel}>Quick Links</span>
            <h2>{sidebarTitle}</h2>
            <p>{sidebarText}</p>

            <div className={styles.linkList}>
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className={styles.sidebarLink}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {note ? (
            <div className={styles.noteCard}>
              <span className={styles.sidebarLabel}>Note</span>
              <p>{note}</p>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
