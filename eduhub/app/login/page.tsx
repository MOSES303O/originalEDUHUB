// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/lib/auth-context";
import { FindCourseForm } from "@/components/find-course-form";
import { AuthenticationModal } from "@/components/authentication-modal";
import { useToast } from "@/hooks/use-toast";
import { login } from "@/lib/api";

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(7);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const router = useRouter();
  const { user, requirePayment, validateToken } = useAuth(); // ← validateToken added
  const { toast } = useToast();

  const handleGetStarted = () => {
    if (!user) {
      setShowAuthModal(true);
    } else if (requirePayment) {
      setShowFindCourseForm(true);
    } else {
      router.push("/courses");
    }
  };

  useEffect(() => {
    if (user && !requirePayment) {
      setPaymentStatus("success");
      setCountdown(7);
    }
  }, [user, requirePayment]);

  useEffect(() => {
    if (paymentStatus === "success" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      router.push("/courses");
    }
  }, [paymentStatus, countdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsProcessing(true);
    setPaymentStatus("processing");

    if (phoneNumber.length !== 10 || !/^0[71]/.test(phoneNumber)) {
      setErrorMessage("Please enter a valid 10-digit number (e.g., 0712345678)");
      setPaymentStatus("error");
      setIsProcessing(false);
      toast({
        title: "Invalid Number",
        description: "Use format: 0712345678",
        variant: "destructive",
      });
      return;
    }

    const formattedPhone = "+254" + phoneNumber.slice(1);

    console.log("LOGIN ATTEMPT →", formattedPhone); // ← YOU WILL SEE THIS

    try {
      const response = await login(formattedPhone, "&mo1se2s3@");
      console.log("LOGIN SUCCESS →", response); // ← YOU WILL SEE THIS

      // Save auth data
      localStorage.setItem("token", response.tokens.access);
      if (response.tokens.refresh) {
        localStorage.setItem("refreshToken", response.tokens.refresh);
      }
      localStorage.setItem("phone_number", response.user.phone_number);

      // Trigger auth update everywhere
      window.dispatchEvent(new Event("auth-change"));
      window.dispatchEvent(new Event("storage"));

      // Force auth context to refresh
      validateToken();

      const isPremium = response.user?.is_premium === true;

      if (isPremium) {
        setPaymentStatus("success");
        toast({ title: "Welcome back!", description: "Login successful" });
      } else {
        setShowFindCourseForm(true);
        toast({
          title: "Payment Required",
          description: "Complete your subscription to continue",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("LOGIN FAILED →", err.response?.data || err.message);
      const msg = err.response?.data?.detail || err.message || "Invalid phone or password";
      setErrorMessage(msg);
      setPaymentStatus("error");
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header currentPage="login" onGetStarted={handleGetStarted} user={user} />
      
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={true} />}
      {showFindCourseForm && (
        <FindCourseForm 
          onClose={() => setShowFindCourseForm(false)} 
          setShowFindCourseForm={setShowFindCourseForm} 
        />
      )}

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Sign in to EduHub</CardTitle>
            <CardDescription>Log in with your phone number</CardDescription>
          </CardHeader>

          <CardContent>
            {paymentStatus === "success" ? (
              <div className="text-center space-y-6">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-5 w-5"/>
                  <AlertDescription>
                    Redirecting in {countdown} seconds...
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/courses">Go to Courses Now</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {paymentStatus === "error" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {/* PHONE INPUT */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number (M-Pesa)</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 bg-emerald-800 text-white font-semibold">
                      +254
                    </span>
                    <input
                      type="tel"
                      placeholder="0712 345 678"
                      className="w-full rounded-r-md border border-emerald-700 bg-[#2d3b38] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={phoneNumber}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        if (v.length <= 10) setPhoneNumber(v);
                      }}
                      maxLength={10}
                      required
                      disabled={isProcessing}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    e.g. <strong>0712345678</strong>
                  </p>
                </div>

                {/* PRICING BOXES — UNCHANGED */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                    <div>
                      <p className="font-medium">EduHub Premium</p>
                      <p className="text-sm text-gray-500">One-time payment</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">KES 210.00</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                    <div>
                      <p className="font-medium">EduHub Renew</p>
                      <p className="text-sm text-gray-500">upon premium expiry</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">KES 50.00</p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>

                {requirePayment && (
                  <Button
                    type="button"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setShowFindCourseForm(true)}
                    disabled={isProcessing}
                  >
                    Select Subjects & Pay Now
                  </Button>
                )}
              </form>
            )}
          </CardContent>

          <CardFooter className="text-center text-sm text-gray-500">
            By logging in, you agree to our{" "}
            <Link href="#" className="text-emerald-600 hover:underline">Terms</Link> and{" "}
            <Link href="#" className="text-emerald-600 hover:underline">Privacy Policy</Link>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  );
}