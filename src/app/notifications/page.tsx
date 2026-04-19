"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import styles from "./page.module.css";

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
};

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const hasNotifications = notifications.length > 0;

  return (
    <AppShell pageTitle="Notifications" pageSubtitle="Recent activity and reminders">
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => {
            setNotifications((prev) => prev.map((entry) => ({ ...entry, read: true })));
          }}
          disabled={!hasNotifications}
        >
          Mark all as read
        </button>
        <button
          type="button"
          onClick={() => {
            setNotifications([]);
          }}
          disabled={!hasNotifications}
        >
          Clear all
        </button>
      </div>

      <section className={styles.list} aria-live="polite">
        {notifications.map((notification) => (
          <article key={notification.id} className={notification.read ? styles.readCard : styles.unreadCard}>
            <h3>{notification.title}</h3>
            <p>{notification.body}</p>
            {!notification.read ? <small>Unread</small> : null}
          </article>
        ))}
      </section>

      {!hasNotifications ? <p className={styles.emptyText}>No notifications yet.</p> : null}
    </AppShell>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
