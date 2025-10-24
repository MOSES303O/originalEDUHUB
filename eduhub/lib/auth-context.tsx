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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [requirePayment, setRequirePayment] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const validateToken = async () => {
    const storedToken = localStorage.getItem("token");
    console.log("[AuthProvider] Validating token:", storedToken ? `Token: ${storedToken.substring(0, 20)}...` : "No token");
    if (!storedToken) {
      console.log("[AuthProvider] No token found, clearing session");
      setUser(null);
      setRequirePayment(true);
      setLoading(false);
      return;
    }

    try {
      console.log("[AuthProvider] Fetching profile for user with token");
      const profileResponse = await apiClient.get("/auth/profile/me/");
      console.log("[AuthProvider] Profile response:", JSON.stringify(profileResponse.data, null, 2));
      const userData = profileResponse.data.data?.user || profileResponse.data.user || profileResponse.data;
      setUser(userData);

      try {
        console.log("[AuthProvider] Fetching subscription status for user:", userData.phone_number || "unknown");
        const subscriptionResponse = await apiClient.get("/payments/my-subscriptions/active/");
        console.log("[AuthProvider] Subscription response:", JSON.stringify(subscriptionResponse.data, null, 2));
        const hasActiveSubscription = subscriptionResponse.data?.success === true && !!subscriptionResponse.data?.data;
        console.log("[AuthProvider] hasActiveSubscription:", hasActiveSubscription);
        setRequirePayment(!hasActiveSubscription);
      } catch (subError: any) {
        console.error("[AuthProvider] Subscription check failed:", extractErrorDetails(subError));
        setRequirePayment(true);
      }
    } catch (error: any) {
      console.error("[AuthProvider] Token validation error:", extractErrorDetails(error));
      if (error.response?.status === 401) {
        console.log("[AuthProvider] 401 detected, handled by apiClient interceptor");
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("phone_number");
        setUser(null);
        setRequirePayment(true);
        toast({
          title: "Session Error",
          description: error.response?.data?.message || "An error occurred. Please log in again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    validateToken();
  }, [toast]);

  const signIn = async (phoneNumber: string, password: string) => {
    console.log("[AuthProvider] signIn called with phoneNumber:", phoneNumber);
    try {
      const response = await apiClient.post("/auth/login/", { phone_number: phoneNumber, password });
      console.log("[AuthProvider] Login response:", JSON.stringify(response.data, null, 2));
      const { access: token, refresh: refreshToken, user: userData } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("phone_number", userData.phone_number || phoneNumber);
      setUser(userData);

      try {
        console.log("[AuthProvider] Fetching subscription status for user:", userData.phone_number || phoneNumber);
        const subscriptionResponse = await apiClient.get("/payments/my-subscriptions/active/");
        console.log("[AuthProvider] signIn subscription response:", JSON.stringify(subscriptionResponse.data, null, 2));
        const hasActiveSubscription = subscriptionResponse.data?.success === true && !!subscriptionResponse.data?.data;
        console.log("[AuthProvider] signIn hasActiveSubscription:", hasActiveSubscription);
        setRequirePayment(!hasActiveSubscription);
      } catch (subError: any) {
        console.error("[AuthProvider] Subscription check failed in signIn:", extractErrorDetails(subError));
        setRequirePayment(true);
      }

      toast({
        title: "Login Successful",
        description: "You are now logged in.",
      });
    } catch (error: any) {
      console.error("[AuthProvider] signIn error:", extractErrorDetails(error));
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("phone_number");
      setUser(null);
      setRequirePayment(true);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Could not validate credentials.";
      toast({
        title: "Authentication Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    try {
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refreshToken");
      if (token && refreshToken) {
        console.log("[AuthProvider] Logging out user");
        await apiClient.post("/auth/logout/", { refresh: refreshToken });
      }
    } catch (error) {
      console.error("[AuthProvider] Error during logout:", extractErrorDetails(error));
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("phone_number");
    setUser(null);
    setRequirePayment(true);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.push("/login");
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    requirePayment,
    setRequirePayment,
    validateToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};