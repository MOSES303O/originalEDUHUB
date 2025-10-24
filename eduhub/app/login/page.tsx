"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const { user, signIn, requirePayment, setRequirePayment } = useAuth();
  const { toast } = useToast();

  // Handle Get Started button click (from Header)
  const handleGetStarted = () => {
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else if (requirePayment) {
      setShowFindCourseForm(true);
      toast({
        title: "Subscription Required",
        description: "Please complete your subscription to access courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      router.push("/courses");
    }
  };

  // Redirect if already authenticated and subscribed
  useEffect(() => {
    if (user && !requirePayment) {
      setPaymentStatus("success");
      setCountdown(7);
      toast({
        title: "Access Granted",
        description: "You have full access to EduHub premium features.",
        duration: 3000,
      });
    }
  }, [user, requirePayment, toast]);

  // Countdown for successful login
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (paymentStatus === "success" && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (paymentStatus === "success" && countdown === 0) {
      router.push("/courses");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [paymentStatus, countdown, router]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value.replace(/[^\d]/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsProcessing(true);
    setPaymentStatus("processing");
  
    const formattedPhone = `+254${phoneNumber.replace(/^\+?254/, "")}`;
    if (!formattedPhone.match(/^\+254\d{9}$/)) {
      setErrorMessage("Please enter a valid Kenyan phone number (e.g., +254712345678)");
      setPaymentStatus("error");
      setIsProcessing(false);
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
  
    try {
      // Step 1: Attempt login
      console.log("Attempting login with phone:", formattedPhone);
      const loginResponse = await login(formattedPhone, "&mo1se2s3@");
      console.log("Login response:", JSON.stringify(loginResponse, null, 2));
      const token = loginResponse.tokens?.access;
      if (!token) {
        throw new Error("Invalid login response: Missing access token");
      }
  
      // Step 2: Sign in
      await signIn(formattedPhone, "&mo1se2s3@");
      console.log("signIn completed, requirePayment:", requirePayment);
  
      // Step 3: Handle subscription status
      if (!requirePayment) {
        console.log("No subscription required, redirecting to courses");
        setPaymentStatus("success");
        setCountdown(7);
        toast({
          title: "Login Successful",
          description: "Redirecting to courses...",
          duration: 3000,
        });
      } else {
        console.log("Subscription required, opening FindCourseForm");
        setShowFindCourseForm(true);
        setPaymentStatus("idle");
        setIsProcessing(false);
        toast({
          title: "Subscription Required",
          description: "Please complete your subscription to access courses.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (err: any) {
      const errorDetails = {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        headers: err.response?.headers,
        body: err.response?.data?.body || JSON.stringify(err.response?.data, null, 2),
      };
      console.error("Error in handleSubmit:", JSON.stringify(errorDetails, null, 2));
      const errorMessage = err.response?.data?.message || err.message || "Failed to log in";
      setErrorMessage(errorMessage);
      setPaymentStatus("error");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayNowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowFindCourseForm(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header currentPage="login" onGetStarted={handleGetStarted} user={user} />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={true} />}
      {showFindCourseForm && (
        <FindCourseForm onClose={() => setShowFindCourseForm(false)} setShowFindCourseForm={setShowFindCourseForm} />
      )}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Sign in to EduHub</CardTitle>
            <CardDescription>
              Log in with your phone number to access premium features
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentStatus === "success" ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Login Successful!</AlertTitle>
                  <AlertDescription>
                    You have full access to EduHub premium features. Redirecting in {countdown} seconds...
                  </AlertDescription>
                </Alert>
                <div className="text-center">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 mt-4"
                    asChild
                  >
                    <Link href="/courses">Explore Courses Now</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {paymentStatus === "error" && (
                  <Alert
                    variant="destructive"
                    className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
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
                      disabled={isProcessing}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">Enter your registered phone number</p>
                </div>
                {requirePayment && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                      <div>
                        <p className="font-medium">EduHub Premium</p>
                        <p className="text-sm text-gray-500">One-time payment</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KES 210.00</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                      <div>
                        <p className="font-medium">EduHub Renew</p>
                        <p className="text-sm text-gray-500">upon premium expiry</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KES 50.00</p>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
                {requirePayment && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    onClick={handlePayNowClick}
                    disabled={isProcessing}
                  >
                    Select Subjects & Pay
                  </Button>
                )}
                {paymentStatus === "processing" && (
                  <div className="text-center text-sm text-gray-500 animate-pulse">
                    Logging in...
                  </div>
                )}
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-500">
              By proceeding, you agree to our{" "}
              <Link href="#" className="text-emerald-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-emerald-600 hover:underline">
                Privacy Policy
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  );
}