"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import styles from "./AppShell.module.css";

type AppShellProps = {
  pageTitle?: string;
  pageSubtitle?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}

function QuestsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s0-11 0-12h12l-3.5 5.5 3.5 5.5H4" />
      <line x1="4" y1="20" x2="4" y2="15" />
    </svg>
  );
}

function ArenaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 8-1.5-5 5 2 3.5-4 3.5 4 5-2L19 8" />
      <path d="M5 8c0 5 3 8 7 9 4-1 7-4 7-9" />
      <path d="M9 17v3" />
      <path d="M15 17v3" />
      <path d="M8 20h8" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3,18 9,11 13,15 21,6" />
      <line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/quests", label: "Quests", icon: <QuestsIcon /> },
  { href: "/arena", label: "Arena", icon: <ArenaIcon /> },
  { href: "/analytics", label: "Analytics", icon: <AnalyticsIcon /> },
  { href: "/profile", label: "Profile", icon: <ProfileIcon /> },
];

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22a2.6 2.6 0 0 0 2.5-2h-5A2.6 2.6 0 0 0 12 22Zm6-6v-5a6 6 0 1 0-12 0v5L4 18v1h16v-1Z" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m19.4 13.5 1.3-1.5-1.3-1.5-1.9.2a6 6 0 0 0-.7-1.7l1.2-1.5-1.7-1.7-1.5 1.2c-.5-.3-1.1-.6-1.7-.7l-.2-1.9h-2.4l-.2 1.9c-.6.1-1.2.4-1.7.7L7.6 4.8 5.9 6.5l1.2 1.5c-.3.5-.6 1.1-.7 1.7l-1.9.2-1.3 1.5 1.3 1.5 1.9-.2c.1.6.4 1.2.7 1.7l-1.2 1.5 1.7 1.7 1.5-1.2c.5.3 1.1.6 1.7.7l.2 1.9h2.4l.2-1.9c.6-.1 1.2-.4 1.7-.7l1.5 1.2 1.7-1.7-1.2-1.5c.3-.5.6-1.1.7-1.7l1.9.2ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
    </svg>
  );
}

export default function AppShell({
  pageTitle,
  pageSubtitle,
  rightAction,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const { profile, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const displayName = useMemo(() => {
    if (profile?.full_name?.trim()) {
      return profile.full_name;
    }

    return user?.email?.split("@")[0] ?? "User";
  }, [profile?.full_name, user?.email]);

  const avatarUrl = typeof profile?.avatar_url === "string" ? profile.avatar_url : null;
  const showCollapsedSidebar = isDesktopViewport && isSidebarCollapsed;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 981px)");
    const syncViewport = (matches: boolean) => {
      setIsDesktopViewport(matches);

      if (matches) {
        setIsSidebarOpen(false);
      }
    };

    syncViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncViewport(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (isDesktopViewport || !isSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isDesktopViewport, isSidebarOpen]);

  useEffect(() => {
    if (isDesktopViewport || !isSidebarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDesktopViewport, isSidebarOpen]);

  const handleSidebarToggle = () => {
    if (isDesktopViewport) {
      setIsSidebarCollapsed((prev) => !prev);
      return;
    }

    setIsSidebarOpen(false);
  };

  return (
    <div className={`${styles.shell} ${showCollapsedSidebar ? styles.shellCollapsed : ""}`}>
      {isSidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""} ${showCollapsedSidebar ? styles.sidebarCollapsed : ""}`}
        aria-label="Primary"
      >
        <div className={styles.sidebarInner}>
          <div className={styles.sidebarTop}>
            <Link href="/dashboard" className={styles.brand} title="BetterMe home">
              <span className={styles.brandOrb}>bm</span>
              <span className={styles.brandText}>
                <strong>BetterMe</strong>
                <small>{profile?.tier ? `${profile.tier} Tier` : "App"}</small>
              </span>
            </Link>

            <button
              type="button"
              className={styles.sidebarToggle}
              onClick={handleSidebarToggle}
              aria-label={
                isDesktopViewport
                  ? isSidebarCollapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
                  : "Close menu"
              }
              aria-pressed={isDesktopViewport ? isSidebarCollapsed : undefined}
            >
              {isDesktopViewport ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {isSidebarCollapsed ? (
                    <path d="m9 18 6-6-6-6" />
                  ) : (
                    <path d="m15 18-6-6 6-6" />
                  )}
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              )}
            </button>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
                  title={showCollapsedSidebar ? item.label : undefined}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <Link
          href="/profile"
          className={styles.sidebarProfile}
          title={showCollapsedSidebar ? displayName : undefined}
        >
          <div className={styles.sidebarAvatar}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile" />
            ) : (
              <span>{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className={styles.sidebarProfileText}>
            <span>{displayName}</span>
            <small>{user?.email}</small>
          </div>
        </Link>
      </aside>

      <div className={styles.contentWrap}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {pageTitle ? (
            <div className={styles.pageHeading}>
              <h1>{pageTitle}</h1>
              {pageSubtitle ? <p>{pageSubtitle}</p> : null}
            </div>
          ) : (
            <div className={styles.pageHeadingEmpty} />
          )}

          <div className={styles.topActions}>
            {rightAction ? <div className={styles.primaryAction}>{rightAction}</div> : null}
            <div className={styles.utilityActions}>
              <Link href="/notifications" className={styles.iconButton} aria-label="Notifications">
                <BellIcon />
              </Link>
              <Link href="/profile" className={styles.iconButton} aria-label="Settings">
                <CogIcon />
              </Link>
              <Link href="/profile" className={styles.avatarButton} aria-label="Profile">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Profile" />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </Link>
            </div>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
