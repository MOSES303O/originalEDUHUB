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
  renewSubscription: () => Promise<void>;
  isPremiumActive: boolean;
  renewalEligible: boolean;
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

  const renewSubscription = async () => {
    try {
      const response = await apiClient.post("/payments/renew/");
      console.log("Renewal success:", response.data);

      // Refresh auth state
      await validateToken();

      toast({
        title: "Renewal Successful",
        description: "Premium access renewed for another 6 hours!",
      });

      setRequirePayment(false);
      setIsPremiumActive(true);

    } catch (error: any) {
      console.error("Renewal failed:", extractErrorDetails(error));
      toast({
        title: "Renewal Failed",
        description: error.response?.data?.error || "Could not renew subscription",
        variant: "destructive",
      });
    }
  };
  const checkActiveSubscription = async () => {
    try {
      const response = await apiClient.get("/payments/my-subscriptions/active");
      console.log("[checkActiveSubscription] Raw response:", response.data);
  
      if (response.data.success === true) {
        const data = response.data.data || {};
        return {
          active: true,
          renewal_eligible: false,
        };
      }
  
      // Handle 402 (Payment Required)
      if (response.status === 402) {
        if (response.data.data?.renewal_eligible) {
          return {
            active: false,
            renewal_eligible: true,
          };
        }
        return {
          active: false,
          renewal_eligible: false,
        };
      }
  
      return { active: false, renewal_eligible: false };
    } catch (error: any) {
      console.error("[checkActiveSubscription] Failed:", extractErrorDetails(error));
      return { active: false, renewal_eligible: false };
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
      setUser(null);
      setRequirePayment(true);
      setIsPremiumActive(false);
      setRenewalEligible(false);
      setLoading(false);
      return;
    }

    try {
      const profileResponse = await apiClient.get("/auth/profile/me/");
      const userData = profileResponse.data.data?.user || profileResponse.data.user || profileResponse.data;
      setUser(userData);

      const { active, renewal_eligible } = await checkActiveSubscription();
      setIsPremiumActive(active);
      setRenewalEligible(renewal_eligible);
      setRequirePayment(!active && !renewal_eligible);

      if (active) {
        const hasSubjects = await checkUserHasSubjects();
        if (!hasSubjects) {
          window.dispatchEvent(new Event("require-subjects"));
        }
      } else {
        // Not active → show form (either new or renewal)
        window.dispatchEvent(new Event("require-subjects"));
      }

    } catch (error: any) {
      console.error("Auth validation failed:", extractErrorDetails(error));
      localStorage.clear();
      setUser(null);
      setRequirePayment(true);
      setIsPremiumActive(false);
      setRenewalEligible(false);
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
      const hasActiveSub = await checkActiveSubscription();
      setRequirePayment(!hasActiveSub);
  
      toast({
        title: "Login Successful",
        description: hasActiveSub 
          ? "Welcome back! Premium access active." 
          : "Please subscribe to access premium features.",
      });
  
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
        renewSubscription,
        setRequirePayment,
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