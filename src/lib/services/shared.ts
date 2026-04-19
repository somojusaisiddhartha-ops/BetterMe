import type { PostgrestError } from "@supabase/supabase-js";

export type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

export function ok<T>(data: T): ServiceResult<T> {
  return {
    data,
    error: null,
  };
}

export function fail<T = null>(message: string): ServiceResult<T> {
  return {
    data: null,
    error: message,
  };
}

export function mapDatabaseError(
  error: PostgrestError | Error | null,
  fallback = "Something went wrong. Please try again.",
) {
  if (!error) {
    return fallback;
  }

  if ("message" in error && typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }

  return fallback;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
