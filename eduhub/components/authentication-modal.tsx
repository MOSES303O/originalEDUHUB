"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { login } from "@/lib/api";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";

interface AuthenticationModalProps {
  onClose: () => void;
  canClose: boolean;
}

export function AuthenticationModal({ onClose, canClose }: AuthenticationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [noSubscription, setNoSubscription] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [mounted, setMounted] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);

  const { 
    renewalEligible, 
    renewSubscription,
    user,               // ← added to detect changes
    requirePayment      // ← added to detect subscription status
  } = useAuth();

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // Re-trigger modal if auth state changes (e.g. logout, subscription expiry)
  useEffect(() => {
    if (!user || requirePayment) {
      setNoSubscription(requirePayment && !!user); // Show renewal if user exists but expired
    }
  }, [user, requirePayment]);

  useEffect(() => {
    if (noSubscription && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (noSubscription && countdown === 0) {
      setShowFindCourseForm(true);
    }
  }, [noSubscription, countdown]);

  const getCleanPhone = (input: string): string => {
    if (input.startsWith("0")) return "254" + input.slice(1);
    if (input.startsWith("254")) return input;
    return "254" + input;
  };

  const handleRenew = async () => {
    setIsSubmitting(true);
    try {
      await renewSubscription();
      toast({ title: "Renewed!", description: "Premium access restored." });
      onClose();
      router.push("/courses");
    } catch (err: any) {
      toast({ title: "Renewal Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNoSubscription(false);
    setCountdown(10);

    if (phoneNumber.length !== 10 || !/^0[71]/.test(phoneNumber)) {
      const msg = "Please enter a valid 10-digit Kenyan number (e.g., 0712345678)";
      setError(msg);
      toast({ title: "Invalid Number", description: msg, variant: "destructive" });
      return;
    }

    const cleanPhone = getCleanPhone(phoneNumber);

    setIsSubmitting(true);

    try {
      console.log("Modal: Logging in with:", cleanPhone);
      const loginResponse = await login(cleanPhone, "&mo1se2s3@");

      console.log("Modal: Login SUCCESS:", loginResponse);

      localStorage.setItem("token", loginResponse.tokens.access);
      if (loginResponse.tokens.refresh) {
        localStorage.setItem("refreshToken", loginResponse.tokens.refresh);
      }
      localStorage.setItem("phone_number", loginResponse.user.phone_number);

      // Force auth refresh across app
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("auth-change"));

      const isPremium = loginResponse.user.is_premium === true;

      if (isPremium) {
        toast({ title: "Welcome back!", description: "You have 6 hours of premium access" });
        onClose();
        router.push("/courses");
      } else {
        setNoSubscription(true);
        toast({ title: "Subscription Expired", description: "Your access has ended. Renew now for 50 KES or pay 210 KES for new access." });
      }
    } catch (err: any) {
      console.error("Modal: Login failed:", err);
      const msg = err.message || "Invalid phone number or password";
      setError(msg);
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent modal from closing if auth is still required
  const handleClose = () => {
    if (!user || requirePayment) {
      // Don't allow close if still unauthenticated or expired
      toast({
        title: "Action Required",
        description: "Please login or renew to continue.",
        variant: "destructive",
      });
      return;
    }
    onClose();
  };

  if (!mounted) return null;

  const modalContent = showFindCourseForm ? (
    <FindCourseForm 
      onClose={() => {
        setShowFindCourseForm(false);
        // Re-open login modal if still required
        if (!user || requirePayment) {
          // Do nothing — keep modal open (prevents closing bug)
        } else {
          onClose();
        }
      }} 
      setShowFindCourseForm={setShowFindCourseForm} 
    />
  ) : (
    <Card className="w-full max-w-md bg-gray-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={!canClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl">Login</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={!canClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <CardDescription>
          {noSubscription ? "Your subscription has expired" : "Enter your phone number to continue"}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {noSubscription && countdown > 0 && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">No active subscription. Redirecting in {countdown}s...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${(countdown / 10) * 100}%` }} />
              </div>
            </div>
          )}

          {!noSubscription && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (M-Pesa)</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 bg-emerald-800 text-white font-semibold">
                    +254
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712 345 678"
                    className="rounded-l-none border-emerald-700 focus:border-emerald-500"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      if (value.length <= 10) setPhoneNumber(value);
                    }}
                    maxLength={10}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Enter your full 10-digit number (e.g., <strong>0712345678</strong>)
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowFindCourseForm(true)}
                disabled={isSubmitting}
              >
                New here? Register
              </Button>
            </>
          )}
        </CardContent>

        {!noSubscription && (
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Logging In...</>
              ) : (
                "Login"
              )}
            </Button>
          </CardFooter>
        )}

        {noSubscription && renewalEligible && (
          <CardFooter className="flex flex-col gap-4">
            <p className="text-center text-sm text-gray-400">
              Your subscription has expired, but you can renew for 50 KES
            </p>
            <Button
              type="button"
              onClick={handleRenew}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Renew Now (50 KES)"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      {modalContent}
    </div>,
    document.body
  );
}