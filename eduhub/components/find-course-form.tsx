"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, AlertCircle, Loader2, Phone, RotateCw, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchSubjects } from "@/lib/api";
import apiClient from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { login } from "@/lib/api";  // ← import login function

interface Subject {
  id: string;
  name: string;
  grade: string;
}

const grades = [
  { value: "A", label: "A", points: 12 },
  { value: "A-", label: "A-", points: 11 },
  { value: "B+", label: "B+", points: 10 },
  { value: "B", label: "B", points: 9 },
  { value: "B-", label: "B-", points: 8 },
  { value: "C+", label: "C+", points: 7 },
  { value: "C", label: "C", points: 6 },
  { value: "C-", label: "C-", points: 5 },
  { value: "D+", label: "D+", points: 4 },
  { value: "D", label: "D", points: 3 },
  { value: "D-", label: "D-", points: 2 },
  { value: "E", label: "E", points: 1 },
];

interface FindCourseFormProps {
  onClose: () => void;
  setShowFindCourseForm?: (show: boolean) => void;
}

export function FindCourseForm({ onClose, setShowFindCourseForm }: FindCourseFormProps) {
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [isSubjectsDropdownOpen, setIsSubjectsDropdownOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "verifying" | "success" | "failed">("idle");
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [reinitiateCount, setReinitiateCount] = useState(0);
  const MAX_REINITIATE = 3;

  const router = useRouter();
  const { toast } = useToast();
  const { isPremiumActive, renewalEligible, validateToken } = useAuth();

  const MIN_SUBJECTS = 7;
  const MAX_SUBJECTS = 9;

  useEffect(() => {
    async function loadSubjects() {
      try {
        const subjects = await fetchSubjects();
        setAvailableSubjects(subjects);
      } catch (err) {
        setError("Failed to load subjects. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load subjects.",
          variant: "destructive",
        });
      }
    }
    loadSubjects();
  }, [toast]);

  useEffect(() => {
    const points = selectedSubjects.reduce((total, subject) => {
      const gradeInfo = grades.find((g) => g.value === subject.grade);
      return total + (gradeInfo?.points || 0);
    }, 0);
    setTotalPoints(points);

    if (!phoneNumber.match(/^\d{9}$/)) {
      setError("Please enter a valid Kenyan phone number WITHOUT THE FIRST ZERO(e.g., 712345678,112345678)");
    } else if (selectedSubjects.length < MIN_SUBJECTS) {
      setError(`Please select at least ${MIN_SUBJECTS} subjects (${selectedSubjects.length}/${MIN_SUBJECTS})`);
    } else if (selectedSubjects.length > MAX_SUBJECTS) {
      setError(`Maximum ${MAX_SUBJECTS} subjects allowed`);
    } else {
      const missingGrades = selectedSubjects.filter((s) => !s.grade);
      if (missingGrades.length > 0) {
        setError(`Please assign grades to all subjects (${missingGrades.length} missing)`);
      } else {
        setError(null);
      }
    }
  }, [selectedSubjects, phoneNumber]);

  const handleSubjectSelect = (subject: { id: string; name: string }) => {
    if (
      selectedSubjects.length < MAX_SUBJECTS &&
      !selectedSubjects.some((s) => s.id === subject.id)
    ) {
      setSelectedSubjects([...selectedSubjects, { ...subject, grade: "" }]);
    }
    setIsSubjectsDropdownOpen(false);
  };

  const handleRemoveSubject = (id: string) => {
    setSelectedSubjects(selectedSubjects.filter((s) => s.id !== id));
  };

  const handleGradeChange = (id: string, grade: string) => {
    setSelectedSubjects(selectedSubjects.map((s) => (s.id === id ? { ...s, grade } : s)));
  };

  const initiatePayment = async () => {
    setIsSubmitting(true);
    setPaymentStatus("processing");
    setError(null);

    const formattedPhone = `+254${phoneNumber.trim()}`;

    try {
      const subjectsPayload = selectedSubjects.map(s => ({
        subject_id: s.id,
        grade: s.grade,
      }));

      const payload = {
        phone_number: formattedPhone,
        amount: renewalEligible ? 50 : 210,  // 50 for renewal, 210 for new
        plan_type: renewalEligible ? "RENEWAL" : "PREMIUM",
        subjects: subjectsPayload,
      };

      console.log("Initiating payment:", payload);

      const response = await apiClient.post("/payments/initiate/", payload);

      const innerData = response.data?.data || response.data || {};
      const ref = innerData.reference || innerData.checkout_request_id || null;

      if (ref) {
        setPaymentReference(ref);
      }

      toast({
        title: "Payment Requested!",
        description: "Complete on your phone, then click COMPLETE below.",
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to initiate payment";
      setError(msg);
      toast({ title: "Payment Failed", description: msg, variant: "destructive" });
      setPaymentStatus("failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (paymentStatus === "verifying" || paymentStatus === "success") return;

    setPaymentStatus("verifying");

    try {
      let isConfirmed = false;

      if (paymentReference) {
        console.log("Checking payment status:", paymentReference);
        const res = await apiClient.get(`/payments/status/${paymentReference}/`);
        const status = res.data?.status;

        if (status === "completed") {
          isConfirmed = true;
        } else if (status === "failed") {
          setPaymentStatus("failed");
          toast({ title: "Payment Failed", description: "Transaction did not complete.", variant: "destructive" });
          return;
        } else {
          setPaymentStatus("processing");
          toast({ title: "Still Processing", description: "Payment is being verified. Wait or retry." });
          return;
        }
      } else {
        // No reference → assume callback already succeeded
        console.warn("No reference — assuming payment completed via callback");
        isConfirmed = true;
      }

      if (isConfirmed) {
        // AUTO-LOGIN with hardcoded password
        console.log("Payment confirmed — auto-logging in user...");
        const formattedPhone = `+254${phoneNumber.trim()}`;

        try {
          const loginResponse = await login(formattedPhone, "&mo1se2s3@");
          console.log("Auto-login success:", loginResponse);

          // Save tokens & trigger auth refresh
          localStorage.setItem("token", loginResponse.tokens.access);
          if (loginResponse.tokens.refresh) {
            localStorage.setItem("refreshToken", loginResponse.tokens.refresh);
          }
          localStorage.setItem("phone_number", loginResponse.user.phone_number);

          window.dispatchEvent(new Event("auth-change"));
          window.dispatchEvent(new Event("storage"));

          await validateToken();  // ← refresh auth context

          setPaymentStatus("success");
          toast({
            title: "Success!",
            description: "You're now logged in with premium access. Redirecting...",
          });

          // Redirect to courses after short delay
          setTimeout(() => {
            router.push("/courses");
            onClose();
          }, 2500);
        } catch (loginErr: any) {
          console.error("Auto-login failed:", loginErr);
          toast({
            title: "Login Failed After Payment",
            description: "Payment succeeded, but login failed. Please login manually.",
            variant: "destructive",
          });
          setPaymentStatus("failed");
        }
      }
    } catch (err: any) {
      console.error("Verification failed:", err);
      setPaymentStatus("failed");
      toast({
        title: "Verification Failed",
        description: "Could not confirm payment. Try again or check M-Pesa.",
        variant: "destructive",
      });
    }
  };

  const handleRetryPayment = async () => {
    if (reinitiateCount >= MAX_REINITIATE) {
      setError("Maximum retries reached.");
      return;
    }
    setReinitiateCount(reinitiateCount + 1);
    await initiatePayment();
  };

  const handleSubmit = async () => {
    if (error || isSubmitting) return;
    await initiatePayment();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl rounded-xl my-4">
        <div className="p-6 md:p-8 space-y-6 md:space-y-8 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="text-center space-y-1 flex-1">
              <h2 className="text-2xl md:text-3xl font-bold">Find Your Course</h2>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                Select your subjects to discover matching university & KMTC programmes
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                router.push("/");
                onClose();
              }}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Error */}
          {error && paymentStatus === "idle" && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Processing / Verifying / Success */}
          {(paymentStatus === "processing" || paymentStatus === "verifying" || paymentStatus === "success") && (
            <div className="text-center space-y-8 py-12">
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-800 animate-ping-slow"></div>
                <div className="absolute inset-3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-6 animate-pulse shadow-lg">
                    <Phone className="w-14 h-14 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-emerald-700 dark:text-emerald-300 animate-pulse">
                {paymentStatus === "processing" && "Payment in Progress..."}
                {paymentStatus === "verifying" && "Verifying Payment..."}
                {paymentStatus === "success" && "Success! Logging in & Redirecting..."}
              </h3>

              <div className="space-y-4 text-base md:text-lg text-gray-700 dark:text-gray-300 max-w-md mx-auto">
                <p className="font-medium">1. Check your phone for M-Pesa prompt</p>
                <p className="font-medium">2. Enter PIN to approve</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  3. Click <strong>COMPLETE</strong> after payment
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button
                  onClick={handleComplete}
                  disabled={paymentStatus === "verifying" || paymentStatus === "success"}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[220px] py-6 text-lg font-semibold shadow-lg"
                >
                  {paymentStatus === "verifying" ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : paymentStatus === "success" ? (
                    "Redirecting..."
                  ) : (
                    "COMPLETE (I Paid!)"
                  )}
                </Button>

                {paymentStatus !== "success" && (
                  <Button
                    variant="outline"
                    onClick={handleRetryPayment}
                    className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 min-w-[220px] py-6 text-lg font-semibold"
                  >
                    <RotateCw className="h-5 w-5 mr-2 animate-spin-slow" />
                    Retry Payment
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Idle Form */}
          {paymentStatus === "idle" && (
            <>
              {/* Phone Number */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium">
                  M-Pesa Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 bg-emerald-800 text-white font-semibold">
                    +254
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="712345678"
                    className="rounded-l-none bg-gray-900 border border-emerald-700 text-white px-3 py-2 w-full"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      if (value.length <= 9) setPhoneNumber(value);
                    }}
                    maxLength={10}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Subjects Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span>Select subjects ({MIN_SUBJECTS}–{MAX_SUBJECTS})</span>
                  <div className="flex items-center gap-2">
                    <span>Total Points:</span>
                    <span className="bg-emerald-800 px-3 py-1 rounded-md">{totalPoints}</span>
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between bg-[#2d3b38] border border-emerald-700 rounded-md px-4 py-2"
                    onClick={() => setIsSubjectsDropdownOpen(!isSubjectsDropdownOpen)}
                    disabled={selectedSubjects.length >= MAX_SUBJECTS || isSubmitting}
                  >
                    <span>
                      {selectedSubjects.length >= MAX_SUBJECTS
                        ? `Maximum ${MAX_SUBJECTS} subjects selected`
                        : "Select subjects..."}
                    </span>
                    <ChevronDown className="h-5 w-5" />
                  </button>

                  {isSubjectsDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-[#2d3b38] border border-emerald-700 rounded-md shadow-lg max-h-60 overflow-auto">
                      {availableSubjects
                        .filter((subject) => !selectedSubjects.some((s) => s.id === subject.id))
                        .map((subject) => (
                          <div
                            key={subject.id}
                            className="px-4 py-2 hover:bg-emerald-700 cursor-pointer"
                            onClick={() => handleSubjectSelect(subject)}
                          >
                            {subject.name}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                  {selectedSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center gap-2 bg-[#2d3b38] border border-emerald-700 rounded-md p-2 flex-shrink-0"
                    >
                      <div className="bg-emerald-800 px-3 py-1 rounded-md">{subject.name}</div>
                      <div className="relative">
                        <select
                          value={subject.grade || ""}
                          onChange={(e) => handleGradeChange(subject.id, e.target.value)}
                          className="bg-emerald-800 border border-emerald-700 rounded-md px-3 py-1 pr-8 appearance-none"
                          disabled={isSubmitting}
                        >
                          <option value="">Grade</option>
                          {grades.map((grade) => (
                            <option key={grade.value} value={grade.value}>
                              {grade.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(subject.id)}
                        className="bg-emerald-700 hover:bg-emerald-600 rounded-full p-1"
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="text-sm text-gray-400">
                  Select between {MIN_SUBJECTS} and {MAX_SUBJECTS} subjects and assign grades.
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!!error || isSubmitting || selectedSubjects.length < MIN_SUBJECTS}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-medium relative"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </span>
                ) : isPremiumActive ? (
                  "Update Subjects & Access Courses"
                ) : renewalEligible ? (
                  "Renew Premium Access (KES 50)"
                ) : (
                  "Submit Subjects & Pay"
                )}
              </Button>

              {/* Login Link */}
              {!isPremiumActive && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                  onClick={() => {
                    if (setShowFindCourseForm) setShowFindCourseForm(false);
                    onClose();
                    document.dispatchEvent(new CustomEvent("open-auth-modal"));
                  }}
                  disabled={isSubmitting}
                >
                  Already subscribed? Login
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}