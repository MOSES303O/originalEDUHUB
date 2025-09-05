"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchKMTCCampuses } from "@/lib/api"; // Import new API handler
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { useSelectedCourses, initializeSelectedCourses, type Course } from "@/lib/course-store";
import { useToast } from "@/hooks/use-toast";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { KMTCRow } from "@/components/kmtc-row"; // Import KMTCRow
import { KMTCCampus } from "@/types";

const gradeMap: Record<string, number> = {
  A: 12, "A-": 11, "B+": 10, B: 9, "B-": 8, "C+": 7, C: 6, "C-": 5, "D+": 4, D: 3, "D-": 2, E: 1,
};

export default function KMTCCoursesPage() {
  const [campuses, setCampuses] = useState<KMTCCampus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { user, loading: authLoading, requirePayment } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { selectedCourses } = useSelectedCourses();

  const userPoints = Number.parseInt(searchParams.get("points") || "0", 10);
  const userGrade = searchParams.get("grade") || "";
  const subjectParams = useMemo(() => searchParams.getAll("subjects"), [searchParams]);

  // Handle Get Started button click
  const handleGetStarted = () => {
    console.log("[KMTCCoursesPage] Get Started clicked, user:", user, "requirePayment:", requirePayment);
    if (!user) {
      console.log("[KMTCCoursesPage] User not logged in, showing auth modal");
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else if (requirePayment) {
      console.log("[KMTCCoursesPage] User not paid, showing auth modal");
      setShowAuthModal(true);
      toast({
        title: "Payment Required",
        description: "Please complete your payment to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      console.log("[KMTCCoursesPage] User authenticated and paid, showing FindCourseForm");
      setShowFindCourseForm(true);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        if (user && !requirePayment) {
          console.log("[KMTCCoursesPage] Initializing selected courses for user:", user);
          await initializeSelectedCourses();
        } else {
          console.log("[KMTCCoursesPage] No user logged in or payment required, skipping initializeSelectedCourses");
        }

        const subjects = subjectParams
          .map((s) => {
            const [subject] = s.split(":");
            return subject;
          })
          .filter((subject) => subject);

        console.log("[KMTCCoursesPage] Fetching KMTC campuses with params:", JSON.stringify({ subjects }, null, 2));
        const data = await fetchKMTCCampuses(); // Use new API handler

        setCampuses(data);
      } catch (err: any) {
        console.error("[KMTCCoursesPage] Error loading data:", JSON.stringify({
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        }, null, 2));
        let errorMessage = "Failed to load KMTC campuses. Please try again later.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [subjectParams, user, authLoading, requirePayment]);

  useEffect(() => {
    if (!authLoading && (!user || requirePayment)) {
      console.log("[KMTCCoursesPage] User not authenticated or payment required, showing auth modal after delay");
      const timer = setTimeout(() => {
        setShowAuthModal(true);
      }, 120000); // 2 minutes
      return () => clearTimeout(timer);
    } else {
      console.log("[KMTCCoursesPage] User authenticated and paid, no auth modal needed");
      setShowAuthModal(false);
    }
  }, [authLoading, user, requirePayment]);

  const filteredCampuses = useMemo(() => {
    console.log("[KMTCCoursesPage] Filtering campuses with searchTerm:", searchTerm);
    return campuses.filter((campus) => {
      const matchesSearch =
        searchTerm === "" ||
        campus.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campus.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campus.city.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [campuses, searchTerm]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPage="kmtc-courses" onGetStarted={handleGetStarted} user={user} />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-start gap-4 mb-8">
              <Button variant="outline" size="sm" asChild className="mb-2">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full">
                <div>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Available KMTC Campuses</h1>
                  <p className="text-gray-500 md:text-xl">
                    Browse through our comprehensive list of KMTC campuses
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (!user || requirePayment) {
                        console.log("[KMTCCoursesPage] Selected Courses clicked, user not authenticated or not paid, showing auth modal");
                        setShowAuthModal(true);
                        toast({
                          title: "Authentication Required",
                          description: "Please log in or complete payment to view selected courses.",
                          variant: "destructive",
                          duration: 3000,
                        });
                      } else {
                        console.log("[KMTCCoursesPage] Selected Courses clicked, redirecting to /selected-courses");
                        router.push("/selected-courses");
                      }
                    }}
                  >
                    <Heart className="h-4 w-4" />
                    Selected Courses ({selectedCourses.length})
                  </Button>
                </div>
              </div>
              <div className="flex-1 relative w-full mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search campuses by name, ID, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
              </div>
              {userPoints > 0 && (
                <div className="flex items-center mt-2">
                  <Badge variant="outline" className="text-sm py-1 px-3 border-emerald-200 dark:border-emerald-800">
                    Your Total Points: {userPoints}
                  </Badge>
                </div>
              )}
            </div>

            {loading || authLoading ? (
              <CoursesSkeleton />
            ) : error ? (
              <div className="flex justify-center items-center p-8 rounded-md border bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-300">
                <p>{error}</p>
                <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : filteredCampuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-md border bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No KMTC campuses found matching your criteria.</p>
                <Button asChild variant="outline">
                  <Link href="/">Start a New Search</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Campus Code</TableHead>
                      <TableHead>Campus Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Available Courses</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampuses.map((campus) => (
                      <KMTCRow
                        key={campus.code}
                        campus={campus}
                        onViewCourses={() => router.push(`/kmtc/campuses/${campus.code}/courses`)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={!!(user && !requirePayment)} />}
      {showFindCourseForm && (
        <FindCourseForm
          onClose={() => setShowFindCourseForm(false)}
          setShowFindCourseForm={setShowFindCourseForm}
        />
      )}
    </div>
  );
}