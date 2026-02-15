"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ChevronDown,
  AlertCircle,
  Loader2,
  Phone,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import apiClient, { fetchSubjects, login } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

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
  const router = useRouter();
  const { toast } = useToast();
  const { renewalEligible, validateToken, isPremiumActive, checkActiveSubscription } = useAuth();

  const [availableSubjects, setAvailableSubjects] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [isSubjectsDropdownOpen, setIsSubjectsDropdownOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "verifying" | "success" | "failed"
  >("idle");
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reinitiateCount, setReinitiateCount] = useState(0);

  const MIN_SUBJECTS = 7;
  const MAX_SUBJECTS = 9;
  const PREMIUM_PRICE = 1;
  const RENEWAL_PRICE = 50;
  const MAX_REINITIATE = 3;

  // Load subjects
  useEffect(() => {
    fetchSubjects()
      .then(setAvailableSubjects)
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load subjects.",
          variant: "destructive",
        });
      });
  }, [toast]);

  // Real-time validation & points calculation
  useEffect(() => {
    const trimmed = phoneNumber.trim();

    // Phone validation
    if (trimmed) {
      if (trimmed.length !== 10 || !trimmed.startsWith("0") || !/^[0][17][0-9]{8}$/.test(trimmed)) {
        setError("Phone must be 10 digits starting with 0 (e.g. 0712345678)");
        return;
      }
    }

    // Subjects validation
    if (selectedSubjects.length < MIN_SUBJECTS) {
      setError(`Select at least ${MIN_SUBJECTS} subjects (${selectedSubjects.length}/${MIN_SUBJECTS})`);
      return;
    }
    if (selectedSubjects.length > MAX_SUBJECTS) {
      setError(`Maximum ${MAX_SUBJECTS} subjects allowed`);
      return;
    }
    if (selectedSubjects.some((s) => !s.grade)) {
      setError("Assign grades to all subjects");
      return;
    }

    setError(null);

    // Calculate total points
    const points = selectedSubjects.reduce((sum, s) => {
      const g = grades.find((x) => x.value === s.grade);
      return sum + (g?.points || 0);
    }, 0);
    setTotalPoints(points);
  }, [phoneNumber, selectedSubjects]);

  const handleSubjectSelect = (subject: { id: string; name: string }) => {
    if (
      selectedSubjects.length < MAX_SUBJECTS &&
      !selectedSubjects.some((s) => s.id === subject.id)
    ) {
      setSelectedSubjects([...selectedSubjects, { ...subject, grade: "" }]);
    }
    setIsSubjectsDropdownOpen(false);
  };

  const handleRemoveSubject = (id: string) =>
    setSelectedSubjects(selectedSubjects.filter((s) => s.id !== id));

  const handleGradeChange = (id: string, grade: string) =>
    setSelectedSubjects(
      selectedSubjects.map((s) => (s.id === id ? { ...s, grade } : s))
    );

  const initiatePayment = async () => {
    if (error) return;

    setIsSubmitting(true);
    setPaymentStatus("processing");

    try {
      const trimmed = phoneNumber.trim();
      const formattedPhone = `+254${trimmed.slice(1)}`;

      const subjectsPayload = selectedSubjects.map((s) => ({
        subject_id: s.id,
        grade: s.grade,
      }));

      const amount = renewalEligible ? RENEWAL_PRICE : PREMIUM_PRICE;

      const payload = {
        phone_number: formattedPhone,
        amount,
        plan_type: renewalEligible ? "RENEWAL" : "PREMIUM",
        subjects: renewalEligible ? [] : subjectsPayload,
      };

      const response = await apiClient.post("/payments/initiate/", payload);
      const ref = response.data?.data?.reference || response.data?.checkout_request_id || null;

      if (ref) setPaymentReference(ref);

      toast({
        title: "Payment Requested",
        description: `Complete ${renewalEligible ? `${RENEWAL_PRICE} KES renewal` : `${PREMIUM_PRICE} KES`} on your phone, then click COMPLETE.`,
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
        isConfirmed = true; // Assume callback already succeeded
      }

      if (isConfirmed) {
        const trimmed = phoneNumber.trim();
        const formattedPhone = `+254${trimmed.slice(1)}`;

        try {
          const loginResponse = await login(formattedPhone, "&mo1se2s3@");

          localStorage.setItem("token", loginResponse.tokens.access);
          if (loginResponse.tokens.refresh) {
            localStorage.setItem("refreshToken", loginResponse.tokens.refresh);
          }
          localStorage.setItem("phone_number", loginResponse.user.phone_number);

          window.dispatchEvent(new Event("auth-change"));
          await validateToken();

          setPaymentStatus("success");
          toast({
            title: "Success!",
            description: "Premium activated. Redirecting...",
          });

          setTimeout(async () => {
            await validateToken();
            const sub = await checkActiveSubscription();
            if (sub.active) {
              toast({ title: "Success", description: "Premium activated!" });
              router.push("/courses");
              onClose();
            } else {
              toast({ title: "Still Pending", description: "Waiting for subscription to activate..." });
            }
          }, 2500); // Give backend callback time to process
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
      setError("Maximum retries reached. Please try again later.");
      return;
    }
    setReinitiateCount((c) => c + 1);
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
                Select subjects to discover matching university & KMTC programmes
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Error */}
          {error && paymentStatus === "idle" && (
            <div className="flex items-center justify-center space-x-2 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Payment Processing / Success */}
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

          {/* Main Form – Idle State */}
          {paymentStatus === "idle" && (
            <>
              {/* Phone Number */}
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium">
                  M-Pesa Phone Number (10 digits)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 bg-emerald-800 text-white font-semibold">
                    +254
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="0712345678"
                    className="rounded-l-none bg-gray-900 border border-emerald-700 text-white px-3 py-2 w-full"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) setPhoneNumber(val);
                    }}
                    maxLength={10}
                    pattern="0[17][0-9]{8}"
                    title="Enter your 10-digit number starting with 0 (e.g., 0712345678)"
                    disabled={isSubmitting}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Enter your full 10-digit number starting with 0 (e.g., 0712345678)
                </p>
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

              {/* Action Button – Dynamic based on renewal eligibility */}
              <Button
                onClick={initiatePayment}
                disabled={
                  !!error ||
                  isSubmitting ||
                  selectedSubjects.length < MIN_SUBJECTS ||
                  phoneNumber.length !== 10 ||
                  !/^[0][17][0-9]{8}$/.test(phoneNumber.trim())
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-medium relative"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : renewalEligible ? (
                  `Renew Access – KES ${RENEWAL_PRICE}`
                ) : (
                  `Submit & Pay `
                )}
              </Button>

              {/* Login Option */}
              {!isPremiumActive && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  onClick={() => {
                    if (setShowFindCourseForm) setShowFindCourseForm(false);
                    onClose();
                    document.dispatchEvent(new CustomEvent("open-auth-modal"));
                  }}
                  disabled={isSubmitting}
                >
                  Already have access? Login
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}