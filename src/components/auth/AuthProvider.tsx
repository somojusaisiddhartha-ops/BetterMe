"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getCurrentUserProfile,
  syncUserProfileFromAuthUser,
} from "@/lib/services/users";
import type { AppUser } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: AppUser | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function resolveProfile(nextUser: User | null) {
  if (!nextUser) {
    return null;
  }

  const syncResult = await syncUserProfileFromAuthUser(nextUser);

  if (syncResult.data) {
    return syncResult.data;
  }

  const profileResult = await getCurrentUserProfile(nextUser.id);
  return profileResult.data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();

    setSession(data.session);
    setUser(data.session?.user ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileResult = await getCurrentUserProfile(user.id);
    if (profileResult.data) {
      setProfile(profileResult.data);
    }
  }, [user]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    const hydrateSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      const nextUser = data.session?.user ?? null;

      setSession(data.session);
      setUser(nextUser);
      setProfile(await resolveProfile(nextUser));
      setIsLoading(false);
    };

    void hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);
      setIsLoading(false);

      window.setTimeout(() => {
        void resolveProfile(nextUser).then((resolvedProfile) => {
          if (active) {
            setProfile(resolvedProfile);
          }
        });
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading,
      refreshSession,
      refreshProfile,
    }),
    [isLoading, profile, refreshProfile, refreshSession, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
