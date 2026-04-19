import { type AuthError, type User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

type AuthResult<T = null> = {
  data: T | null;
  error: string | null;
};

function formatAuthError(error: AuthError | Error | null) {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  if (error.message) {
    return error.message;
  }

  return "Authentication failed. Please try again.";
}

function getRedirectUrl(path = "/dashboard") {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}${path}`;
}

export async function signInWithGoogle(redirectPath = "/dashboard"): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getRedirectUrl(redirectPath),
    },
  });

  if (error) {
    return { data: null, error: formatAuthError(error) };
  }

  return { data: null, error: null };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  options?: {
    redirectPath?: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<AuthResult<{ needsEmailConfirmation: boolean }>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getRedirectUrl(options?.redirectPath ?? "/dashboard"),
      data: options?.metadata,
    },
  });

  if (error) {
    return { data: null, error: formatAuthError(error) };
  }

  return {
    data: {
      needsEmailConfirmation: !data.session,
    },
    error: null,
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { data: null, error: formatAuthError(error) };
  }

  return { data: null, error: null };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { data: null, error: formatAuthError(error) };
  }

  return { data: null, error: null };
}

export async function getCurrentUser(): Promise<AuthResult<User>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { data: null, error: formatAuthError(error) };
  }

  return { data: data.user, error: null };
}
