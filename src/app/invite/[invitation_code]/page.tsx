"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GuestRoute from "@/components/auth/GuestRoute";
import AuthForm from "@/components/auth/AuthForm";
import { getInvitationByCode } from "@/lib/services/invitations";
import type { Invitation } from "@/types/domain";
import styles from "@/app/auth/auth-page.module.css";

export default function InvitePage() {
  const params = useParams<{ invitation_code: string }>();
  const [invitationCode, setInvitationCode] = useState<string>("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const code = params.invitation_code;

      if (!active) {
        return;
      }

      if (!code) {
        setInviteError("Invitation code is missing.");
        setIsLoadingInvite(false);
        return;
      }

      setInvitationCode(code);

      const invitationResult = await getInvitationByCode(code);

      if (!active) {
        return;
      }

      if (invitationResult.error) {
        setInviteError(invitationResult.error);
      } else {
        setInvitation(invitationResult.data);
      }

      setIsLoadingInvite(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [params.invitation_code]);

  return (
    <GuestRoute>
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.marketing}>
            <span className={styles.marketingBadge}>Private Invite</span>
            <h1>Join your friend on BetterMe.</h1>
            <p>
              Accept your invite, create your account, and start building your quest
              streak with your circle.
            </p>
            {inviteError ? <p>{inviteError}</p> : null}
          </section>

          {isLoadingInvite ? (
            <div>Loading invitation...</div>
          ) : (
            <AuthForm
              mode="signup"
              invitationCode={invitationCode}
              inviterName={invitation?.invited_by_username}
              prefilledEmail={invitation?.invited_email}
            />
          )}
        </div>
      </main>
    </GuestRoute>
  );
}
