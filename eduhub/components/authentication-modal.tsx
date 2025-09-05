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
import { useAuth } from "@/lib/auth-context";
import { FindCourseForm } from "@/components/find-course-form";

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
  const { toast } = useToast();
  const { signIn, requirePayment, setRequirePayment } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (noSubscription && countdown > 0) {
      toast({
        title: "No Active Subscription",
        description: `Redirecting to register in ${countdown} seconds...`,
        duration: 1000,
      });
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (noSubscription && countdown === 0) {
      setShowFindCourseForm(true);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [noSubscription, countdown, toast]);

  const [showFindCourseForm, setShowFindCourseForm] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    setPhoneNumber(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNoSubscription(false);
    setCountdown(10);

    const formattedPhone = `+254${phoneNumber.replace(/^\+?254/, "")}`;
    const isValidPhone = /^[0-9]{9}$/.test(phoneNumber) && formattedPhone.match(/^\+254\d{9}$/);
    if (!isValidPhone) {
      const errorMessage = "Please enter a valid Kenyan phone number (e.g., +254712345678)";
      setError(errorMessage);
      toast({
        title: "Invalid Phone Number",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Attempting login with phone:", formattedPhone);
      const loginResponse = await login(formattedPhone, "&mo1se2s3@");
      console.log("Login response:", JSON.stringify(loginResponse, null, 2));

      const userToken = loginResponse.tokens?.access;
      const userId = loginResponse.user?.id;
      if (!userToken || !userId) {
        throw new Error("Invalid login response: Missing token or user ID");
      }

      console.log("Calling signIn with token:", userToken.substring(0, 20) + "...");
      await signIn(userToken);
      console.log("signIn completed, requirePayment:", requirePayment);

      if (!requirePayment) {
        setRequirePayment(false);
        console.log("User has active subscription, redirecting to courses");
        onClose();
        router.push("/courses");
      } else {
        console.log("No active subscription, starting countdown");
        setNoSubscription(true);
      }
    } catch (err: any) {
      const errorMessage = err.message?.includes("Failed to retrieve active subscription")
        ? "Unable to verify your subscription status. Please try again or contact support."
        : err.message || "An unexpected error occurred during login";
      setError(errorMessage);
      console.error("Error in handleSubmit:", err.message, err);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const modalContent = showFindCourseForm ? (
    <FindCourseForm onClose={onClose} setShowFindCourseForm={setShowFindCourseForm} />
  ) : (
    <Card className="w-full max-w-md bg-[#1a2521]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              router.push("/");
              onClose();
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl">Login</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={!canClose}
            className={canClose ? "" : "opacity-50 cursor-not-allowed"}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <CardDescription>Enter your phone number to check your subscription.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {noSubscription && countdown > 0 && (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">No active subscription. Redirecting in {countdown} seconds...</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full"
                    style={{ width: `${(countdown / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
            {!noSubscription && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">+254</div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="712345678"
                    className="rounded-l-none"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Enter your registered phone number</p>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowFindCourseForm(true)}
              disabled={isSubmitting || noSubscription}
            >
              Switch to Register
            </Button>
          </div>
        </CardContent>
        {!noSubscription && (
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging In...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );

  return createPortal(
    <div className="fixed top-[80px] inset-x-0 bottom-0 bg-black/50 flex items-center justify-center z-40 p-4">
      {modalContent}
    </div>,
    document.body
  );
}