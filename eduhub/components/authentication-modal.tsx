"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, Clock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { login } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FindCourseForm } from "@/components/find-course-form"; // ← import it

interface AuthenticationModalProps {
  onClose: () => void;
  canClose?: boolean;
}

export function AuthenticationModal({ onClose, canClose = true }: AuthenticationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(10);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);

  const { 
    user, 
    isPremiumActive, 
    renewalEligible, 
    requirePayment,
    renewSubscription,
    validateToken 
  } = useAuth();

  const { toast } = useToast();
  const router = useRouter();

  // Auto-validate on mount
  useEffect(() => {
    validateToken();
  }, []);

  // Countdown for renewal grace period
  useEffect(() => {
    if (requirePayment && renewalEligible && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [requirePayment, renewalEligible, countdown]);

  const handleRenew = async () => {
    setIsSubmitting(true);
    try {
      await renewSubscription();
      await validateToken();
      toast({ 
        title: "Renewed!", 
        description: "Premium restored for another 6 hours (50 KES)" 
      });
      onClose();
      router.push("/courses");
    } catch (err: any) {
      toast({ 
        title: "Renewal Failed", 
        description: err.message || "Try again", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const trimmed = phoneNumber.trim();
    if (!/^\d{10}$/.test(trimmed) || !trimmed.startsWith("0")) {
      setError("Enter a valid 10-digit Kenyan number starting with 0 (e.g., 0712345678)");
      setIsSubmitting(false);
      return;
    }

    const cleanPhone = "254" + trimmed.slice(1);

    try {
      const response = await login(cleanPhone, "&mo1se2s3@");

      localStorage.setItem("token", response.tokens.access);
      if (response.tokens.refresh) localStorage.setItem("refreshToken", response.tokens.refresh);
      localStorage.setItem("phone_number", response.user.phone_number);

      window.dispatchEvent(new Event("auth-change"));
      await validateToken();

      // After login, check subscription status
      if (response.user.is_premium || isPremiumActive) {
        toast({ title: "Welcome!", description: "Premium is active – redirecting..." });
        onClose();
        router.push("/courses");
      } else if (renewalEligible) {
        toast({ 
          title: "Premium Expired", 
          description: "Renew now for 50 KES (grace period remaining)" 
        });
        // Stay in modal → renewal button is shown
      } else {
        // Expired and NOT renewal eligible → force open FindCourseForm
        setShowFindCourseForm(true);
        toast({ 
          title: "Subscription Expired", 
          description: "Please complete payment of 210 KES to continue" 
        });
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your number.");
      toast({ 
        title: "Login Error", 
        description: err.message || "Something went wrong", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (requirePayment && !renewalEligible && !showFindCourseForm) {
      toast({
        title: "Action Required",
        description: "Please login, renew, or subscribe to continue",
        variant: "destructive",
      });
      return;
    }
    onClose();
  };

  // Show FindCourseForm when needed
  if (showFindCourseForm) {
    return (
      <FindCourseForm 
        onClose={() => {
          setShowFindCourseForm(false);
          if (!requirePayment) onClose();
        }} 
        setShowFindCourseForm={setShowFindCourseForm}
      />
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-emerald-800 shadow-2xl">
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {renewalEligible ? "Renew Premium (50 KES)" : "Login / Register"}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              disabled={requirePayment && !canClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <CardDescription className="text-base mt-1">
            {renewalEligible 
              ? `Premium expired – renew now for 50 KES (grace period: ${countdown}s remaining)` 
              : "Enter your 10-digit phone number starting with 0"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renewalEligible ? (
            <div className="space-y-6 text-center py-8">
              <Clock className="h-16 w-16 mx-auto text-emerald-500 animate-pulse" />
              <h3 className="text-xl font-bold text-emerald-400">
                Renew for 50 KES
              </h3>
              <p className="text-gray-300">
                Restore full premium access for another 6 hours
              </p>
              <Button
                onClick={handleRenew}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Renewing...
                  </>
                ) : (
                  "Renew Now – 50 KES"
                )}
              </Button>
              <p className="text-sm text-gray-400">
                Or login to check your current status
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">Phone Number</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-5 rounded-l-md border border-r-0 bg-emerald-900 text-white font-semibold text-lg">
                    +254
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712345678"
                    className="rounded-l-none border-emerald-700 focus:border-emerald-500 bg-gray-950 text-white text-lg py-6"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setPhoneNumber(val);
                    }}
                    maxLength={10}
                    pattern="0[17][0-9]{8}"
                    title="Enter 10-digit number starting with 0 (e.g., 0712345678)"
                    disabled={isSubmitting}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Enter your full 10-digit number starting with 0 (e.g., 0712345678)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-6 font-semibold"
                disabled={isSubmitting || phoneNumber.length !== 10}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login / Continue"
                )}
              </Button>

              {/* Always-visible button to start new subscription */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                onClick={() => {
                  setShowFindCourseForm(true);
                }}
                disabled={isSubmitting}
              >
                New here? Pay 210 KES to start
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-gray-400 pt-2 border-t border-emerald-800">
          {renewalEligible 
            ? "Renewal window: 24 hours after expiry" 
            : "First premium access: 210 KES | Renewal: 50 KES"}
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
}