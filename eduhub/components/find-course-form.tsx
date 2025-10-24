"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchSubjects, login, register, initiatePayment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface FindCourseFormProps {
  onClose: () => void;
  setShowFindCourseForm: (show: boolean) => void;
}

interface Subject {
  id: string;
  name: string;
  grade: string;
}

interface AuthResponse {
  success: boolean;
  tokens?: { access: string; refresh: string };
  user: { phone_number: string; is_premium: boolean };
  message?: string;
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

export function FindCourseForm({ onClose, setShowFindCourseForm }: FindCourseFormProps) {
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [isSubjectsDropdownOpen, setIsSubjectsDropdownOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { setRequirePayment, validateToken } = useAuth(); // Use validateToken
  const { toast } = useToast();
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
          description: "Failed to load subjects. Please try again.",
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
      setError("Please enter a valid Kenyan phone number (e.g., 712345678)");
    } else if (selectedSubjects.length < MIN_SUBJECTS) {
      setError(`Please select at least ${MIN_SUBJECTS} subjects (${selectedSubjects.length}/${MIN_SUBJECTS} selected)`);
    } else if (selectedSubjects.length > MAX_SUBJECTS) {
      setError(`You can select up to ${MAX_SUBJECTS} subjects (${selectedSubjects.length}/${MAX_SUBJECTS} selected)`);
    } else {
      const missingGrades = selectedSubjects.filter((s) => !s.grade);
      if (missingGrades.length > 0) {
        setError(`Please select grades for all subjects (${missingGrades.length} missing)`);
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

  const handleSubmit = async () => {
    if (error) return;

    setIsSubmitting(true);
    const formattedPhone = `+254${phoneNumber.replace(/^\+?254/, "")}`;
    const defaultPassword = "&mo1se2s3@"; // Hardcoded password as required

    try {
      const subjects = selectedSubjects.map((s) => ({
        subject_id: s.id,
        grade: s.grade,
      }));

      let userData: AuthResponse;
      try {
        const response = await register({
          phone_number: formattedPhone,
          password: defaultPassword,
          password_confirm: defaultPassword,
          subjects,
        });
        userData = response;
        if (!userData.tokens?.access) {
          throw new Error("Registration succeeded but no access token provided");
        }
        localStorage.setItem("token", userData.tokens.access);
        localStorage.setItem("refreshToken", userData.tokens.refresh);
        localStorage.setItem("phone_number", userData.user.phone_number);
        await validateToken();
      } catch (registerError: any) {
        let errorDetails;
        try {
          errorDetails = JSON.parse(registerError.message || "{}");
        } catch {
          errorDetails = { message: registerError.message || "Registration failed" };
        }
        if (
          errorDetails.status === 400 &&
          errorDetails.data?.phone_number?.some((err: any) =>
            err.includes("user with this phone number already exists")
          )
        ) {
          const loginResponse = await login(formattedPhone, defaultPassword);
          userData = {
            ...loginResponse,
            success: true,
          };
          if (!loginResponse.tokens?.access) {
            throw new Error("Login succeeded but no access token provided");
          }
          localStorage.setItem("token", loginResponse.tokens.access);
          localStorage.setItem("refreshToken", loginResponse.tokens.refresh);
          localStorage.setItem("phone_number", loginResponse.user.phone_number);
          await validateToken();
        } else {
          throw registerError;
        }
      }

      if (userData.user.is_premium) {
        setRequirePayment(false);
      } else {
        const paymentResponse = await initiatePayment(
          1000,
          1,
          formattedPhone,
          "EduPathway Basic Plan"
        );
        if (paymentResponse.status !== "success") {
          setRequirePayment(true);
          toast({
            title: "Payment Required",
            description: "Please complete the payment to proceed.",
            variant: "destructive",
          });
          return;
        }
        setRequirePayment(false);
      }

      const queryParams = new URLSearchParams();
      selectedSubjects.forEach((s) => {
        queryParams.append("subjects", `${s.id}:${s.grade}`);
      });
      queryParams.append("points", totalPoints.toString());
      router.push(`/courses?${queryParams.toString()}`);
      onClose();
    } catch (err: any) {
      let errorMessage = "An unexpected error occurred";
      let errorDetails;
      try {
        errorDetails = JSON.parse(err.message || "{}");
      } catch {
        errorDetails = { message: err.message || "Unknown error" };
      }
      if (errorDetails.status === 400 || errorDetails.status === 401) {
        errorMessage = errorDetails.data?.message || errorDetails.data?.phone_number?.[0] || "Invalid phone number or password";
      } else if (errorDetails.status === 429) {
        errorMessage = "Too many attempts. Please try again later.";
      } else if (errorDetails.status === 503) {
        errorMessage = "Unable to connect to the server. Please check your network.";
      } else if (err.message?.includes("Payment initiation failed")) {
        errorMessage = "Failed to initiate payment. Please try again.";
      } else if (err.message?.includes("access token provided")) {
        errorMessage = err.message;
      } else {
        errorMessage = errorDetails.data?.message || errorDetails.message || errorMessage;
      }
      console.error("Error in handleSubmit:", err, errorDetails);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed top-[80px] inset-x-0 bottom-0 flex items-center justify-center z-40 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#1a2521] text-white rounded-lg my-4">
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Find Your Course</h2>
              <p className="text-gray-400">
                Select your high school subjects to discover university courses that match your interests and strengths
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                router.push("/");
                onClose();
              }}
              className="text-white hover:bg-emerald-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium">
                Phone Number (M-Pesa)
              </label>
              <div className="flex">
                <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-emerald-800">
                  +254
                </span>
                <input
                  id="phone"
                  type="tel"
                  placeholder="712345678"
                  className="rounded-l-none bg-[#2d3b38] border border-emerald-700 text-white px-3 py-2 w-full"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))}
                  maxLength={9}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span>Select your high school subjects ({MIN_SUBJECTS}-{MAX_SUBJECTS})</span>
              <div className="flex items-center gap-2">
                <span>Total Points:</span>
                <span className="bg-emerald-800 px-3 py-1 rounded-md">{totalPoints}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-md flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            )}

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
              Select between {MIN_SUBJECTS} and {MAX_SUBJECTS} subjects you studied in high school and assign grades to each.
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!!error || isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-md"
            >
              {isSubmitting ? "Submitting..." : "Submit Subjects & Pay"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowFindCourseForm(false)}
              disabled={isSubmitting}
            >
              Switch to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}