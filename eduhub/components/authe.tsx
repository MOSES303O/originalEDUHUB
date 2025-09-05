"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { login, initiatePayment, verifyPayment } from "@/lib/api";
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
  const [stkPushSent, setStkPushSent] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [paymentReference, setPaymentReference] = useState("");
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { signIn, setRequirePayment } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    setPhoneNumber(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
  
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
      if (loginResponse.user.is_premium) {
        setRequirePayment(false);
        console.log("Calling signIn for premium user with token:", userToken.substring(0, 20) + "...");
        await signIn(userToken);
        console.log("Premium user, redirecting to courses");
        onClose();
        router.push("/courses");
        return;
      }
  
      console.log("Calling signIn with token:", userToken.substring(0, 20) + "...");
      await signIn(userToken);
      console.log("Initiating payment for:", formattedPhone);
      const paymentResponse = await initiatePayment(1000, 1, formattedPhone, "EduPathway Basic Plan");
      console.log("Payment response:", JSON.stringify(paymentResponse, null, 2));
      if (paymentResponse.status !== "success") {
        throw new Error(paymentResponse.message || "Payment initiation failed");
      }
      setPaymentReference(paymentResponse.data.payment_reference);
      setStkPushSent(true);
      setCountdown(30);
      toast({
        title: "Payment Initiated",
        description: "STK push sent to your phone. Please complete the payment.",
      });
    } catch (err: any) {
      const errorMessage = err.message.includes("Failed to retrieve active subscription")
        ? "Unable to verify your subscription status. Please ensure your subscription is set up or contact support."
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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;

    if (stkPushSent && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      if (paymentReference) {
        pollInterval = setInterval(async () => {
          try {
            console.log("Verifying payment for reference:", paymentReference);
            const verifyResponse = await verifyPayment(paymentReference);
            console.log("Verify payment response:", verifyResponse);
            if (verifyResponse.status === "success" && verifyResponse.data.status === "completed") {
              setCountdown(0);
              setRequirePayment(false);
              toast({
                title: "Payment Successful",
                description: "Your payment has been confirmed. Redirecting to courses...",
              });
              onClose();
              router.push("/courses");
            } else if (verifyResponse.status === "success" && verifyResponse.data.status === "failed") {
              setError("Payment failed. Please try again.");
              setStkPushSent(false);
              setIsSubmitting(false);
              setCountdown(0);
              toast({
                title: "Payment Failed",
                description: "Payment was not completed. Please try again.",
                variant: "destructive",
              });
            }
          } catch (err: any) {
            console.error("Error verifying payment:", err.message);
          }
        }, 5000);
      }
    } else if (stkPushSent && countdown === 0 && paymentReference) {
      verifyPayment(paymentReference)
        .then((verifyResponse) => {
          console.log("Final payment verification:", verifyResponse);
          if (verifyResponse.status === "success" && verifyResponse.data.status === "completed") {
            setRequirePayment(false);
            toast({
              title: "Payment Successful",
              description: "Your payment has been confirmed. Redirecting to courses...",
            });
            onClose();
            router.push("/courses");
          } else {
            setError("Payment not completed in time. Please try again.");
            setStkPushSent(false);
            setIsSubmitting(false);
            toast({
              title: "Payment Timeout",
              description: "Payment was not completed. Please try again.",
              variant: "destructive",
            });
          }
        })
        .catch((err) => {
          console.error("Error verifying payment:", err.message);
          setError("Failed to verify payment. Please try again.");
          setStkPushSent(false);
          setIsSubmitting(false);
          toast({
            title: "Payment Verification Failed",
            description: "Unable to verify payment status. Please try again.",
            variant: "destructive",
          });
        });
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [stkPushSent, countdown, paymentReference, router, toast, setRequirePayment, onClose]);

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
        <CardDescription>Enter your phone number you paid with to login.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {stkPushSent ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    STK push sent to your phone. Please check your phone and complete the payment.
                  </AlertDescription>
                </Alert>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Waiting for payment confirmation...</p>
                  <p className="text-sm text-gray-500">Auto-redirecting in {countdown} seconds</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full"
                      style={{ width: `${(countdown / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (M-Pesa)</Label>
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
                  <p className="text-xs text-gray-500">Enter your M-Pesa registered phone number</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowFindCourseForm(true)}
                  disabled={isSubmitting}
                >
                  Switch to Register
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        {!stkPushSent && (
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
                "Login and Pay"
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