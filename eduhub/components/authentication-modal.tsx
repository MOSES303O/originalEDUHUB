"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, ArrowLeft, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { login } from "@/lib/api";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";

interface AuthenticationModalProps {
  onClose: () => void;
  canClose?: boolean; // defaults to true
}

export function AuthenticationModal({ onClose, canClose = true }: AuthenticationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [countdown, setCountdown] = useState(10);

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

  // Auto-validate on mount and state changes
  useEffect(() => {
    validateToken();
  }, []);

  // Handle countdown → show full form only if NOT renewal eligible
  useEffect(() => {
    if (requirePayment && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (requirePayment && countdown === 0 && !renewalEligible) {
      setShowFindCourseForm(true);
    }
  }, [requirePayment, countdown, renewalEligible]);

  const handleRenew = async () => {
    setIsSubmitting(true);
    try {
      await renewSubscription();
      await validateToken();
      toast({ 
        title: "Renewed Successfully", 
        description: "Premium access restored for another 6 hours!" 
      });
      onClose();
      router.push("/courses");
    } catch (err: any) {
      toast({ 
        title: "Renewal Failed", 
        description: err.message || "Please try again later", 
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

    const cleanPhone = phoneNumber.startsWith("0") 
      ? "254" + phoneNumber.slice(1) 
      : phoneNumber.startsWith("254") ? phoneNumber : "254" + phoneNumber;

    if (cleanPhone.length !== 12 || !/^254[17]/.test(cleanPhone)) {
      setError("Invalid Kenyan phone number (e.g., 0712345678)");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await login(cleanPhone, "&mo1se2s3@");

      localStorage.setItem("token", response.tokens.access);
      if (response.tokens.refresh) localStorage.setItem("refreshToken", response.tokens.refresh);
      localStorage.setItem("phone_number", response.user.phone_number);

      window.dispatchEvent(new Event("auth-change"));
      await validateToken();

      if (response.user.is_premium) {
        toast({ 
          title: "Welcome back!", 
          description: "Premium active for 6 hours" 
        });
        onClose();
        router.push("/courses");
      } else if (renewalEligible) {
        toast({ 
          title: "Premium Expired", 
          description: "Renew now for 50 KES" 
        });
      } else {
        setShowFindCourseForm(true);
        toast({ 
          title: "No Active Access", 
          description: "Register or pay 210 KES to continue" 
        });
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (requirePayment) {
      toast({
        title: "Cannot Close",
        description: "Please login or renew to continue",
        variant: "destructive",
      });
      return;
    }
    onClose();
  };

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-emerald-800 shadow-2xl">
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {renewalEligible ? "Renew Premium Access" : "Login"}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              disabled={requirePayment}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <CardDescription className="text-base mt-1">
            {renewalEligible 
              ? "Your 6-hour premium has ended – renew now for 50 KES" 
              : "Enter your phone number to login or register"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renewalEligible ? (
            <div className="space-y-6 text-center py-6">
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-12 w-12 text-emerald-500" />
                <p className="text-lg font-medium text-emerald-400">
                  Renew now for only 50 KES
                </p>
                <p className="text-sm text-gray-300">
                  Get another 6 hours of full premium access
                </p>
              </div>

              <Button
                onClick={handleRenew}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-6 font-semibold"
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
                Or login with existing credentials to check status
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">M-Pesa Phone Number</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-5 rounded-l-md border border-r-0 bg-emerald-900 text-white font-semibold text-lg">
                    +254
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="712345678"
                    className="rounded-l-none border-emerald-700 focus:border-emerald-500 bg-gray-950 text-white text-lg py-6"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 9) setPhoneNumber(val);
                    }}
                    maxLength={9}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Enter your 9-digit number (e.g., 712345678)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-6 font-semibold"
                disabled={isSubmitting}
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

              <Button
                type="button"
                variant="outline"
                className="w-full border-emerald-700 text-emerald-400 hover:bg-emerald-950"
                onClick={() => setShowFindCourseForm(true)}
                disabled={isSubmitting}
              >
                New here? Register (210 KES first access)
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center text-sm text-gray-400 pt-2 border-t border-emerald-800">
          {renewalEligible 
            ? "Renewal window closes in 24 hours from expiry" 
            : "New users: First premium access is 210 KES"}
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
}