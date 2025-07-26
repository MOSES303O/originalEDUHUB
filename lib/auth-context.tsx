"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api";

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
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [requirePayment, setRequirePayment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem("token");
      console.log("Validating token on load:", storedToken ? `Token: ${storedToken.substring(0, 20)}...` : "No token");
      if (storedToken) {
        try {
          const response = await apiClient.get("/auth/profile/me/", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          console.log("Profile response:", JSON.stringify(response.data, null, 2));
          setUser(response.data.data?.user || response.data.user || response.data);
          const subscriptionResponse = await apiClient.get("/payments/my-subscriptions/active/", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          console.log("Subscription response:", JSON.stringify(subscriptionResponse.data, null, 2));
          setRequirePayment(!subscriptionResponse.data.success);
        } catch (error: any) {
          console.error("Token validation error:", JSON.stringify({
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          }, null, 2));
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("phone_number");
          setUser(null);
          setRequirePayment(true);
          toast({
            title: "Session Expired",
            description: "Please log in and complete payment.",
            variant: "destructive",
          });
        }
      } else {
        setRequirePayment(true);
      }
      setLoading(false);
    };
    validateToken();
  }, [toast]);

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
      const subscriptionResponse = await apiClient.get("/payments/my-subscriptions/active/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("signIn subscription response:", JSON.stringify(subscriptionResponse.data, null, 2));
      setRequirePayment(!subscriptionResponse.data.success);
      toast({
        title: "Login Successful",
        description: "You are now logged in.",
      });
    } catch (error: any) {
      console.error("signIn error:", JSON.stringify({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      }, null, 2));
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("phone_number");
      setUser(null);
      setRequirePayment(true);
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || "Could not validate authentication token.";
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