"use client";

import Link from "next/link";
import GuestRoute from "@/components/auth/GuestRoute";
import AuthForm from "@/components/auth/AuthForm";
import styles from "@/app/auth/auth-page.module.css";

export default function SignInPage() {
  return (
    <GuestRoute>
      <main className={styles.signinPage}>
        <AuthForm mode="signin" />

        <footer className={styles.signinFooter}>
          <Link href="/privacy">Privacy Policy</Link>
          <span className={styles.signinFooterDot} />
          <Link href="/terms">Terms of Service</Link>
          <span className={styles.signinFooterDot} />
          <Link href="/help">Help Center</Link>
        </footer>
      </main>
    </GuestRoute>
  );
}
