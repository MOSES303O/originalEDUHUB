"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  requirePayment: boolean;
  setRequirePayment: (value: boolean) => void;
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

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem("token");
      console.log("Validating token on load:", storedToken ? `Token: ${storedToken.substring(0, 20)}...` : "No token");
      if (!storedToken) {
        console.log("No token found, redirecting to homepage");
        setRequirePayment(true);
        router.push("/");
        setLoading(false);
        return;
      }
  
      try {
        console.log("Fetching profile for user with token");
        const profileResponse = await apiClient.get("/auth/profile/me/", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        console.log("Profile response:", JSON.stringify(profileResponse.data, null, 2));
        setUser(profileResponse.data.data?.user || profileResponse.data.user || profileResponse.data);
  
        try {
          const subscriptionUrl = "/payments/my-subscriptions/active/";
          const fullUrl = `${apiClient.defaults.baseURL}${subscriptionUrl}`;
          console.log("Attempting to fetch subscription status for user:", 
            profileResponse.data.data?.user?.phone_number || profileResponse.data.user?.phone_number || "unknown");
          console.log("Subscription request URL:", fullUrl);
          console.log("apiClient configuration:", {
            baseURL: apiClient.defaults.baseURL,
            headers: apiClient.defaults.headers.common,
            authHeader: `Bearer ${storedToken.substring(0, 20)}...`,
          });
          const subscriptionResponse = await apiClient.get(subscriptionUrl, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          console.log("Subscription response status:", subscriptionResponse.status);
          console.log("Subscription response data:", JSON.stringify(subscriptionResponse.data, null, 2));
          const hasActiveSubscription = subscriptionResponse.data?.success === true && !!subscriptionResponse.data?.data;
          console.log("Evaluated hasActiveSubscription:", hasActiveSubscription);
          console.log("Setting requirePayment:", !hasActiveSubscription);
          setRequirePayment(!hasActiveSubscription);
          if (hasActiveSubscription) {
            console.log("Redirecting to /courses due to active subscription");
            router.push("/courses");
          } else {
            console.log("Redirecting to FindCourseForm due to no active subscription");
          }
        } catch (subError: any) {
          console.error("Subscription check failed:", {
            message: subError.message,
            status: subError.response?.status,
            data: JSON.stringify(subError.response?.data, null, 2),
            headers: subError.response?.headers,
            requestUrl: subError.config?.url,
            fullUrl: subError.config ? `${apiClient.defaults.baseURL}${subError.config.url}` : "unknown",
          });
          setRequirePayment(true);
          console.log("Redirecting to FindCourseForm due to subscription check failure");
        }
      } catch (error: any) {
        console.error("Token validation error:", {
          message: error.message,
          status: error.response?.status,
          data: JSON.stringify(error.response?.data, null, 2),
          headers: error.response?.headers,
        });
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("phone_number");
        setUser(null);
        setRequirePayment(true);
        if (error.response?.status === 401) {
          console.log("Invalid or expired token detected, redirecting to homepage");
          router.push("/");
        } else {
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
    validateToken();
  }, [toast, router]);
  
  const signIn = async (token: string) => {
    console.log("signIn called with token:", token.substring(0, 20) + "...");
    try {
      const response = await apiClient.get("/auth/profile/me/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("signIn profile response:", JSON.stringify(response.data, null, 2));
      localStorage.setItem("token", token);
      localStorage.setItem("phone_number", response.data.data?.user?.phone_number || response.data.user?.phone_number || "");
      setUser(response.data.data?.user || response.data.user || response.data);
  
      try {
        const subscriptionUrl = "/payments/my-subscriptions/active/";
        const fullUrl = `${apiClient.defaults.baseURL}${subscriptionUrl}`;
        console.log("Attempting to fetch subscription status in signIn for user:", 
          response.data.data?.user?.phone_number || response.data.user?.phone_number || "unknown");
        console.log("Subscription request URL:", fullUrl);
        console.log("apiClient configuration:", {
          baseURL: apiClient.defaults.baseURL,
          headers: apiClient.defaults.headers.common,
          authHeader: `Bearer ${token.substring(0, 20)}...`,
        });
        const subscriptionResponse = await apiClient.get(subscriptionUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("signIn subscription response status:", subscriptionResponse.status);
        console.log("signIn subscription response data:", JSON.stringify(subscriptionResponse.data, null, 2));
        const hasActiveSubscription = subscriptionResponse.data?.success === true && !!subscriptionResponse.data?.data;
        console.log("signIn evaluated hasActiveSubscription:", hasActiveSubscription);
        console.log("Setting requirePayment in signIn:", !hasActiveSubscription);
        setRequirePayment(!hasActiveSubscription);
        if (hasActiveSubscription) {
          console.log("Redirecting to /courses due to active subscription in signIn");
          router.push("/courses");
        } else {
          console.log("Redirecting to FindCourseForm due to no active subscription in signIn");
        }
      } catch (subError: any) {
        console.error("Subscription check failed in signIn:", {
          message: subError.message,
          status: subError.response?.status,
          data: JSON.stringify(subError.response?.data, null, 2),
          headers: subError.response?.headers,
          requestUrl: subError.config?.url,
          fullUrl: subError.config ? `${apiClient.defaults.baseURL}${subError.config.url}` : "unknown",
        });
        setRequirePayment(true);
        console.log("Redirecting to FindCourseForm due to subscription check failure in signIn");
      }
  
      toast({
        title: "Login Successful",
        description: "You are now logged in.",
      });
    } catch (error: any) {
      console.error("signIn error:", {
        message: error.message,
        status: error.response?.status,
        data: JSON.stringify(error.response?.data, null, 2),
        headers: error.response?.headers,
      });
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("phone_number");
      setUser(null);
      setRequirePayment(true);
      const errorMessage = error.message?.includes("Failed to retrieve active subscription")
        ? "Unable to verify your subscription status. Please try again or contact support."
        : error.response?.data?.message || error.response?.data?.detail || error.message || "Could not validate authentication token.";
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
        await apiClient.post("/auth/logout/", { refresh: refreshToken }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error("Error during logout:", JSON.stringify(error, null, 2));
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
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    requirePayment,
    setRequirePayment,
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