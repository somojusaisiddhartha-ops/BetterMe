"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return <div style={{ padding: "2rem", color: "#4b5563" }}>Checking session...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
