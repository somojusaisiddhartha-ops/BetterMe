"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { signOut } from "@/lib/auth";
import { buildAnalyticsSnapshot } from "@/lib/services/analytics";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriendsSnapshot,
  rejectFriendRequest,
  sendFriendRequest,
  unfriend,
} from "@/lib/services/friends";
import { createInvitation } from "@/lib/services/invitations";
import { listUserQuests } from "@/lib/services/quests";
import {
  searchUserByEmail,
  updateCurrentUserProfile,
} from "@/lib/services/users";
import { TIER_COLORS } from "@/lib/constants";
import type { AppUser, FriendsSnapshot, AnalyticsSnapshot } from "@/types/domain";
import styles from "./page.module.css";

function ProfileContent() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [friends, setFriends] = useState<FriendsSnapshot>({
    incomingRequests: [],
    outgoingRequests: [],
    acceptedFriends: [],
  });

  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);

  const [friendEmailQuery, setFriendEmailQuery] = useState("");
  const [searchedUser, setSearchedUser] = useState<AppUser | null>(null);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "not_found">("idle");
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserName = useMemo(() => {
    if (profile?.full_name?.trim()) {
      return profile.full_name;
    }

    return user?.email?.split("@")[0] ?? "User";
  }, [profile?.full_name, user?.email]);

  const refreshFriends = async () => {
    if (!user) {
      return;
    }

    const friendResult = await getFriendsSnapshot(user.id);
    if (friendResult.data) {
      setFriends(friendResult.data);
    }

    if (friendResult.error) {
      setErrorMessage(friendResult.error);
    }
  };

  useEffect(() => {
    if (!profile || !user) {
      return;
    }

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setDisplayName(profile.full_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setErrorMessage(null);
      setInfoMessage(null);

      const [friendResult, questsResult] = await Promise.all([
        getFriendsSnapshot(user.id),
        listUserQuests(user.id),
      ]);

      if (!active) {
        return;
      }

      if (friendResult.data) {
        setFriends(friendResult.data);
      }

      if (friendResult.error) {
        setErrorMessage(friendResult.error);
      }

      if (questsResult.data) {
        setAnalytics(buildAnalyticsSnapshot(profile, questsResult.data));
      }

      if (questsResult.error) {
        setErrorMessage(questsResult.error);
      }

      setIsLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [profile, user]);

  const relationshipLabelForSearchedUser = useMemo(() => {
    if (!searchedUser) {
      return null;
    }

    if (friends.acceptedFriends.some((entry) => entry.id === searchedUser.id)) {
      return "Friends";
    }

    if (friends.outgoingRequests.some((entry) => entry.user.id === searchedUser.id)) {
      return "Pending";
    }

    if (friends.incomingRequests.some((entry) => entry.user.id === searchedUser.id)) {
      return "Accept Request";
    }

    return "Add Friend";
  }, [friends.acceptedFriends, friends.incomingRequests, friends.outgoingRequests, searchedUser]);

  const handleProfileSave = async () => {
    if (!profile) {
      return;
    }

    setIsSavingProfile(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const result = await updateCurrentUserProfile(profile.id, {
      full_name: displayName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });

    if (result.error) {
      setErrorMessage(result.error);
      setIsSavingProfile(false);
      return;
    }

    await refreshProfile();
    setInfoMessage("Profile updated.");
    setIsSavingProfile(false);
  };

  const handleFriendSearch = async () => {
    if (!user || !friendEmailQuery.trim()) {
      return;
    }

    setSearchStatus("loading");
    setErrorMessage(null);
    setInfoMessage(null);
    setInvitationLink(null);

    const result = await searchUserByEmail(friendEmailQuery.trim(), user.id);

    if (result.error) {
      setErrorMessage(result.error);
      setSearchStatus("idle");
      return;
    }

    if (!result.data) {
      setSearchedUser(null);
      setSearchStatus("not_found");
      return;
    }

    setSearchedUser(result.data);
    setSearchStatus("idle");
  };

  const handleInviteGeneration = async () => {
    if (!user || !profile) {
      return;
    }

    const invitationResult = await createInvitation(user.id, currentUserName, friendEmailQuery.trim());

    if (invitationResult.error || !invitationResult.data) {
      setErrorMessage(invitationResult.error ?? "Could not generate invitation.");
      return;
    }

    const origin = window.location.origin;
    const link = `${origin}/invite/${invitationResult.data.invitation_code}`;
    setInvitationLink(link);
    setInfoMessage(`Share this link with ${friendEmailQuery.trim()} to invite them to BetterMe.`);
  };

  const handleAddFriendAction = async () => {
    if (!user || !searchedUser) {
      return;
    }

    if (relationshipLabelForSearchedUser === "Friends" || relationshipLabelForSearchedUser === "Pending") {
      return;
    }

    if (relationshipLabelForSearchedUser === "Accept Request") {
      const request = friends.incomingRequests.find((entry) => entry.user.id === searchedUser.id);
      if (!request) {
        return;
      }

      const result = await acceptFriendRequest(request.relationshipId);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      await refreshFriends();
      setInfoMessage("Friend request accepted.");
      return;
    }

    const result = await sendFriendRequest(user.id, searchedUser.id);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    await refreshFriends();
    setInfoMessage("Friend request sent.");
  };

  const handleLogout = async () => {
    const result = await signOut();

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    router.replace("/");
  };

  return (
    <AppShell pageTitle="Profile" pageSubtitle="Manage your account, stats, and social graph">
      <section className={styles.profileCard}>
        <div className={styles.profileCardBody}>
          <div className={styles.avatarArea}>
            <div className={styles.avatarShell}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile" />
              ) : (
                <span>{currentUserName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div>
              <p className={styles.tierBadge} style={{ color: TIER_COLORS[profile?.tier ?? "Bronze"] }}>
                {profile?.tier ?? "Bronze"} Tier
              </p>
              <h2>{currentUserName}</h2>
              <p>{profile?.email}</p>
              <small>{(profile?.total_xp ?? 0).toLocaleString()} Total XP</small>
            </div>
          </div>

          <div className={styles.editGrid}>
            <label>
              Full Name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
              />
            </label>
            <button type="button" onClick={handleProfileSave} disabled={isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article>
          <p>Joined Date</p>
          <h3>{profile ? new Date(profile.created_at).toLocaleDateString() : "-"}</h3>
        </article>
        <article>
          <p>Current Streak</p>
          <h3>{analytics?.currentStreak ?? 0} days</h3>
        </article>
        <article>
          <p>Total Quests Completed</p>
          <h3>{analytics?.questsCompletedAllTime ?? 0}</h3>
        </article>
        <article>
          <p>Consistency Score</p>
          <h3>{profile?.consistency_score ?? 0}%</h3>
        </article>
      </section>

      <section className={styles.friendsGrid}>
        <article className={styles.card}>
          <h3>Add Friend</h3>
          <div className={styles.searchRow}>
            <input
              type="email"
              value={friendEmailQuery}
              onChange={(event) => setFriendEmailQuery(event.target.value)}
              placeholder="Enter friend's email"
            />
            <button type="button" onClick={handleFriendSearch} disabled={searchStatus === "loading"}>
              {searchStatus === "loading" ? "Searching..." : "Search"}
            </button>
          </div>

          {searchedUser ? (
            <div className={styles.searchResult}>
              <p>{searchedUser.full_name?.trim() || searchedUser.email.split("@")[0]}</p>
              <small>{searchedUser.tier}</small>
              <button type="button" onClick={handleAddFriendAction}>
                {relationshipLabelForSearchedUser}
              </button>
            </div>
          ) : null}

          {searchStatus === "not_found" ? (
            <div className={styles.searchResult}>
              <p>User not found</p>
              <button type="button" onClick={handleInviteGeneration}>
                Generate Invite Link
              </button>
            </div>
          ) : null}

          {invitationLink ? (
            <div className={styles.inviteBox}>
              <p>{invitationLink}</p>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(invitationLink);
                  setInfoMessage("Invitation link copied.");
                }}
              >
                Copy
              </button>
            </div>
          ) : null}
        </article>

        <article className={styles.card}>
          <h3>Pending Requests</h3>

          <div className={styles.requestGroup}>
            <h4>Incoming</h4>
            {friends.incomingRequests.length === 0 ? <p>No incoming requests.</p> : null}
            {friends.incomingRequests.map((entry) => (
              <div key={entry.relationshipId} className={styles.friendRow}>
                <span>{entry.user.full_name?.trim() || entry.user.email.split("@")[0]}</span>
                <div>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await acceptFriendRequest(entry.relationshipId);
                      if (result.error) {
                        setErrorMessage(result.error);
                        return;
                      }

                      await refreshFriends();
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await rejectFriendRequest(entry.relationshipId);
                      if (result.error) {
                        setErrorMessage(result.error);
                        return;
                      }

                      await refreshFriends();
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.requestGroup}>
            <h4>Outgoing</h4>
            {friends.outgoingRequests.length === 0 ? <p>No outgoing requests.</p> : null}
            {friends.outgoingRequests.map((entry) => (
              <div key={entry.relationshipId} className={styles.friendRow}>
                <span>{entry.user.full_name?.trim() || entry.user.email.split("@")[0]}</span>
                <div>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await cancelFriendRequest(entry.relationshipId);
                      if (result.error) {
                        setErrorMessage(result.error);
                        return;
                      }

                      await refreshFriends();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.card}>
          <h3>Friends</h3>
          {friends.acceptedFriends.length === 0 ? <p>No friends yet.</p> : null}
          {friends.acceptedFriends.map((entry) => (
            <div key={entry.id} className={styles.friendRow}>
              <span>
                {entry.full_name?.trim() || entry.email.split("@")[0]} · {entry.tier}
              </span>
              <div>
                <small>{entry.total_xp.toLocaleString()} XP</small>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) {
                      return;
                    }

                    const confirmed = window.confirm("Remove this friend?");
                    if (!confirmed) {
                      return;
                    }

                    const result = await unfriend(user.id, entry.id);
                    if (result.error) {
                      setErrorMessage(result.error);
                      return;
                    }

                    await refreshFriends();
                  }}
                >
                  Unfriend
                </button>
              </div>
            </div>
          ))}
        </article>
      </section>

      <section className={styles.card}>
        <h3>Account Settings</h3>
        <div className={styles.accountActions}>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      {isLoading ? <p className={styles.infoText}>Loading profile...</p> : null}
      {infoMessage ? <p className={styles.infoText}>{infoMessage}</p> : null}
      {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
