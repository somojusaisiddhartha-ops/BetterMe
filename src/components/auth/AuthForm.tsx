"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/lib/auth";
import { redeemInvitation, setPendingInvitationCode } from "@/lib/services/invitations";
import { normalizeEmail } from "@/lib/services/shared";
import { useAuth } from "@/components/auth/AuthProvider";
import styles from "./AuthForm.module.css";

const MailIcon = () => (
  <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

function getPasswordStrength(pw: string): { label: string; level: number } | null {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", level: 1 };
  if (score <= 2) return { label: "Fair", level: 2 };
  if (score <= 3) return { label: "Better than average", level: 3 };
  if (score <= 4) return { label: "Strong", level: 4 };
  return { label: "Very Strong", level: 5 };
}

type AuthFormMode = "signin" | "signup";

type AuthFormProps = {
  mode: AuthFormMode;
  invitationCode?: string;
  inviterName?: string;
  prefilledEmail?: string;
};

export default function AuthForm({ mode, invitationCode, inviterName, prefilledEmail }: AuthFormProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = mode === "signup" ? getPasswordStrength(password) : null;

  const canSubmit = useMemo(() => {
    const base = normalizeEmail(email).length > 4 && password.length >= 6 && !isSubmitting;
    return mode === "signup" ? base && agreedToTerms : base;
  }, [email, isSubmitting, password, mode, agreedToTerms]);

  const handleInvitationRedemption = async () => {
    if (!invitationCode || !user) return;
    const redeemed = await redeemInvitation(invitationCode, user.id, user.email);
    if (redeemed.error) {
      setInfoMessage("Account created, but invitation could not be auto-redeemed yet. It will retry on dashboard.");
      return;
    }
    setInfoMessage("Invitation redeemed. You are now connected with your inviter.");
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    const normalizedEmail = normalizeEmail(email);
    if (invitationCode) setPendingInvitationCode(invitationCode);

    if (mode === "signin") {
      const result = await signInWithEmail(normalizedEmail, password);
      if (result.error) { setErrorMessage(result.error); setIsSubmitting(false); return; }
      if (invitationCode && user) await handleInvitationRedemption();
      router.replace(invitationCode ? `/dashboard?invite=${invitationCode}` : "/dashboard");
      return;
    }

    const result = await signUpWithEmail(normalizedEmail, password, {
      redirectPath: invitationCode ? `/dashboard?invite=${invitationCode}` : "/dashboard",
      metadata: {
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
        ...(invitationCode ? { invitation_code: invitationCode } : {}),
      },
    });

    if (result.error) { setErrorMessage(result.error); setIsSubmitting(false); return; }
    if (result.data?.needsEmailConfirmation) {
      setInfoMessage("Account created. Please verify your email, then sign in to continue.");
      setIsSubmitting(false);
      return;
    }
    router.replace(invitationCode ? `/dashboard?invite=${invitationCode}` : "/dashboard");
  };

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    if (invitationCode) setPendingInvitationCode(invitationCode);
    const redirectPath = invitationCode ? `/dashboard?invite=${invitationCode}` : "/dashboard";
    const result = await signInWithGoogle(redirectPath);
    if (result.error) { setErrorMessage(result.error); setIsSubmitting(false); return; }
    setIsSubmitting(false);
  };

  if (mode === "signup") {
    return (
      <section className={styles.card}>
        {invitationCode && (
          <div className={styles.inviteBanner}>
            <p><strong>{inviterName ?? "A friend"}</strong> invited you to join BetterMe.</p>
            <small>Invitation code: {invitationCode}</small>
          </div>
        )}

        <div className={styles.signupHeader}>
          <h1>
            Your Level-Up Journey{" "}
            <span className={styles.greenText}>Starts Here.</span>
          </h1>
          <p>Create an account to start leveling up your life and unlocking quests.</p>
        </div>

        <form className={styles.form} onSubmit={handleEmailAuth}>
          <div className={styles.nameRow}>
            <label>
              First Name
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                disabled={isSubmitting}
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                disabled={isSubmitting}
              />
            </label>
          </div>

          <label>
            Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isSubmitting}
              placeholder="you@example.com"
            />
          </label>

          <label>
            <div className={styles.passwordLabelRow}>
              <span>Password</span>
              <button
                type="button"
                className={styles.showPasswordBtn}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              disabled={isSubmitting}
              placeholder="Minimum 6 characters"
            />
            {passwordStrength && (
              <div className={styles.strengthContainer}>
                <div className={styles.strengthBars}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`${styles.strengthBar} ${lvl <= passwordStrength.level ? styles[`s${passwordStrength.level}` as keyof typeof styles] : ""}`}
                    />
                  ))}
                </div>
                <span className={styles.strengthLabel}>Strength: {passwordStrength.label}</span>
              </div>
            )}
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className={styles.termsLink}>Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className={styles.termsLink}>Privacy Policy</Link>.
            </span>
          </label>

          <button type="submit" className={styles.submitButton} disabled={!canSubmit}>
            {isSubmitting ? "Please wait..." : "Get Started Free"}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account?{" "}
          <Link href="/auth/signin">Log In</Link>
        </p>

        {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
        {infoMessage && <p className={styles.infoText}>{infoMessage}</p>}
      </section>
    );
  }

  return (
    <section className={styles.signinCard}>
      <div className={styles.signinLogo}>
        <span className={styles.signinLogoBlack}>Better</span>
        <span className={styles.signinLogoGreen}>Me</span>
      </div>

      {invitationCode && (
        <div className={styles.inviteBanner}>
          <p><strong>{inviterName ?? "A friend"}</strong> invited you to join BetterMe.</p>
          <small>Invitation code: {invitationCode}</small>
        </div>
      )}

      <div className={styles.signinHeader}>
        <h1>Welcome Back! 👋</h1>
        <p>Ready to continue your level-up journey?</p>
      </div>

      <form className={styles.form} onSubmit={handleEmailAuth}>
        <label>
          Email Address
          <div className={styles.inputWithIcon}>
            <MailIcon />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isSubmitting}
              placeholder="name@example.com"
            />
          </div>
        </label>

        <label>
          <div className={styles.passwordLabelRow}>
            <span>Password</span>
            <Link href="/auth/forgot-password" className={styles.forgotLink}>Forgot Password?</Link>
          </div>
          <div className={styles.inputWithIcon}>
            <LockIcon />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={6}
              required
              disabled={isSubmitting}
              placeholder="••••••••"
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>

        <button type="submit" className={styles.submitButton} disabled={!canSubmit}>
          {isSubmitting ? "Please wait..." : "Log In"}
        </button>
      </form>

      <div className={styles.divider}>
        <span>OR CONTINUE WITH</span>
      </div>

      <div className={styles.socialButtons}>
        <button
          type="button"
          className={styles.socialButton}
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
        >
          <GoogleIcon />
          Google
        </button>
      </div>

      <p className={styles.switchText}>
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup">Sign Up</Link>
      </p>

      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
      {infoMessage && <p className={styles.infoText}>{infoMessage}</p>}
    </section>
  );
}
