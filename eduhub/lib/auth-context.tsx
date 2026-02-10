// frontend/lib/auth-context.tsx — FINAL WITH 6-HOUR LOGIC
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import apiClient, { extractErrorDetails } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (phoneNumber: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requirePayment: boolean;
  setRequirePayment: (value: boolean) => void;
  validateToken: () => Promise<void>;
  initiatePayment: (amount: number, subjects?: string[]) => Promise<void>;
  isPremiumActive: boolean;
  renewalEligible: boolean;
  checkActiveSubscription: () => Promise<any>;
  setUser: React.Dispatch<React.SetStateAction<any | null>>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [requirePayment, setRequirePayment] = useState(false);
  const [isPremiumActive, setIsPremiumActive] = useState(false);
  const [renewalEligible, setRenewalEligible] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const initiatePayment = async (amount: number, subjects: string[] = []) => {
  try {
    const phone = localStorage.getItem("phone_number");
    if (!phone) throw new Error("Phone number missing");

    const response = await apiClient.post("/payments/initiate/", {
      phone_number: phone,
      amount,
      subjects,
    });

    toast({
      title: "Payment Initiated",
      description: "Check your phone to complete M-Pesa payment",
    });

  } catch (error: any) {
    toast({
      title: "Payment Failed",
      description:"IMEKATAA",
      variant: "destructive",
    });
    throw error;
  }
};

  const checkActiveSubscription = async () => {
    try {
      const response = await apiClient.get("/payments/my-subscriptions/active");

      if (response.data.success) {
        return response.data.data;
      }

      return {
        active: false,
        renewal_eligible: false,
        hours_remaining: 0,
      };
    } catch {
      return {
        active: false,
        renewal_eligible: false,
        hours_remaining: 0,
      };
    }
  };


  const checkUserHasSubjects = async (): Promise<boolean> => {
    try {
      const response = await apiClient.get("/auth/subjects/");
      return Array.isArray(response.data) && response.data.length > 0;
    } catch {
      return false;
    }
  };

  const validateToken = async () => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken) {
      console.log("[validateToken] No token → anonymous");
      setUser(null);
      setRequirePayment(true);
      setIsPremiumActive(false);
      setRenewalEligible(false);
      setLoading(false);
      return;
    }

    try {
      // 1. Get user profile
      const profileResponse = await apiClient.get("/auth/profile/me/");
      const userData = profileResponse.data.data?.user || profileResponse.data.user || profileResponse.data;
      setUser(userData);

      // 2. Check subscription
      const sub = await checkActiveSubscription();
      setIsPremiumActive(sub.active);
      setRenewalEligible(sub.renewal_eligible);
      setRequirePayment(!sub.active && !sub.renewal_eligible);

      console.log("[validateToken] Success:", {
        user: userData?.phone_number,
        active: sub.active,
        renewal: sub.renewal_eligible,
      });

      // Only trigger subjects check if premium active
      if (sub.active) {
        const hasSubjects = await checkUserHasSubjects();
        if (!hasSubjects) {
          window.dispatchEvent(new Event("require-subjects"));
        }
      }

    } catch (error: any) {
      const status = error.response?.status;
      const details = extractErrorDetails(error);
      console.error("Auth validation failed:", { status, details });

      // ONLY clear on explicit auth failure (401/403)
      if (status === 401 || status === 403) {
        console.warn("[validateToken] Auth failure → clearing token");
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        // Keep phone_number for auto-fill
        setUser(null);
        setRequirePayment(true);
        setIsPremiumActive(false);
        setRenewalEligible(false);
      } else {
        // Network/500/empty response → keep token, don't clear
        console.warn("[validateToken] Non-auth error, keeping token");
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    validateToken();

    const handleStorage = () => validateToken();
    const handleAuthChange = () => validateToken();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  const signIn = async (phoneNumber: string, password: string) => {
    try {
      console.log("[AuthProvider] Signing in:", phoneNumber);
      const response = await apiClient.post("/auth/login/", {
        phone_number: phoneNumber,
        password,
      });
  
      const { access: token, refresh: refreshToken, user: userData } = response.data;
  
      localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("phone_number", userData.phone_number || phoneNumber);
  
      setUser(userData);
  
      // Check subscription after login
      const sub = await checkActiveSubscription();
      setIsPremiumActive(sub.active);
      setRenewalEligible(sub.renewal_eligible);
      setRequirePayment(!sub.active && !sub.renewal_eligible);  
    } catch (error: any) {
      console.error("[AuthProvider] Login failed:", extractErrorDetails(error));
      
      // Clean state
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("phone_number");
      setUser(null);
      setRequirePayment(true);
  
      const msg = error.response?.data?.message || error.response?.data?.detail || "Invalid phone or password";
      toast({
        title: "Login Failed",
        description: msg,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.clear();
    setUser(null);
    setRequirePayment(true);
    setIsPremiumActive(false);
    setRenewalEligible(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        requirePayment,
        initiatePayment,
        setRequirePayment,
        checkActiveSubscription,
        validateToken,
        isPremiumActive,
        renewalEligible,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};