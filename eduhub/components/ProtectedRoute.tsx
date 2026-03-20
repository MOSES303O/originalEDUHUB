// components/ProtectedRoute.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdvanced?: boolean;
};

export default function ProtectedRoute({
  children,
  requireAdvanced = false,
}: ProtectedRouteProps) {
  const { 
    user,                  // instead of isAuthenticated
    isPremiumActive,       // ← this is your "hasPremium"
    qualifiesForAdvanced,
    loading 
  } = useAuth();

  const router = useRouter();

  const isAuthenticated = !!user;  // derived from user presence

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    const canAccess = isPremiumActive || qualifiesForAdvanced;

    if (requireAdvanced && !canAccess) {
      router.replace("/kmtc");
    }
  }, [loading, isAuthenticated, isPremiumActive, qualifiesForAdvanced, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <p>Loading authentication...</p>
    </div>;
  }

  if (!isAuthenticated) return null;

  const canAccess = isPremiumActive || qualifiesForAdvanced;
  if (requireAdvanced && !canAccess) return null;

  return <>{children}</>;
}