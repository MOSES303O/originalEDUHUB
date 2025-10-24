"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchKMTCCampuses, fetchSelectedCourses } from "@/lib/api";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { useSelectedCourses, initializeSelectedCourses } from "@/lib/course-store";
import { useToast } from "@/hooks/use-toast";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { KMTCRow } from "@/components/kmtc-row";
import type { KMTCCampus, Course } from "@/types";

function KMTCCoursesPageContent() {
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
  const subjectParams = useMemo(() => searchParams.getAll("subjects"), [searchParams]);

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
      setShowAuthModal(true);
      toast({
        title: "Payment Required",
        description: "Please complete your payment to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      setShowFindCourseForm(true);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        if (user && !requirePayment) {
          await initializeSelectedCourses();
        }

        const data = await fetchKMTCCampuses();
        setCampuses(data);
      } catch (err: any) {
        const errorMessage =
          err.message && JSON.parse(err.message)?.message
            ? JSON.parse(err.message).message
            : "Failed to load KMTC campuses. Please try again later.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [subjectParams, user, authLoading, requirePayment]);

  useEffect(() => {
    if (!authLoading && (!user || requirePayment)) {
      const timer = setTimeout(() => setShowAuthModal(true), 120_000);
      return () => clearTimeout(timer);
    } else {
      setShowAuthModal(false);
    }
  }, [authLoading, user, requirePayment]);

  const filteredCampuses = useMemo(() => {
    return campuses.filter((campus) => {
      const term = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        campus.name.toLowerCase().includes(term) ||
        campus.code.toLowerCase().includes(term) ||
        (campus.city && campus.city.toLowerCase().includes(term))
      );
    });
  }, [campuses, searchTerm]);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900">
      <Header currentPage="kmtc-courses" onGetStarted={handleGetStarted} user={user} />
      <main className="flex-1">
        <section className="w-full py-6 sm:py-8 md:py-12 lg:py-16">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
            {/* Header & Search */}
            <div className="flex flex-col items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-xs sm:text-sm"
              >
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Back to Home
                </Link>
              </Button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4 sm:gap-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text tracking-tight">
                    Available KMTC Campuses
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">
                    Browse through our comprehensive list of KMTC campuses
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-xs sm:text-sm border-gray-200 dark:border-gray-700"
                  onClick={() => {
                    if (!user || requirePayment) {
                      setShowAuthModal(true);
                      toast({
                        title: "Authentication Required",
                        description: "Please log in or complete payment to view selected courses.",
                        variant: "destructive",
                        duration: 3000,
                      });
                    } else {
                      router.push("/selected-courses");
                    }
                  }}
                >
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                  Selected Courses ({selectedCourses.length})
                </Button>
              </div>

              <div className="flex-1 relative w-full mb-4 sm:mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  placeholder="Search campuses by name, ID, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 sm:h-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>

              {userPoints > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm py-1 px-3 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                >
                  Your Total Points: {userPoints}
                </Badge>
              )}
            </div>

            {/* ==== THE UNIFIED UI PATTERN ==== */}
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
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No KMTC campuses found matching your criteria.
                </p>
                <Button asChild variant="outline">
                  <Link href="/">Start a New Search</Link>
                </Button>
              </div>
            ) : (
              <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm card-hover">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
                      <TableHead className="text-xs sm:text-sm">Campus Code</TableHead>
                      <TableHead className="text-xs sm:text-sm">Campus Name</TableHead>
                      <TableHead className="text-xs sm:text-sm">Location</TableHead>
                      <TableHead className="text-center text-xs sm:text-sm">Available Courses</TableHead>
                      <TableHead className="text-center text-xs sm:text-sm">Type</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampuses.map((campus) => (
                      <KMTCRow
                        key={campus.code}
                        campus={campus}
                        onViewCourses={() => router.push(`/kmtc/${campus.code}/courses`)}
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

      {showAuthModal && (
        <AuthenticationModal
          onClose={() => setShowAuthModal(false)}
          canClose={!!(user && !requirePayment)}
        />
      )}
      {showFindCourseForm && (
        <FindCourseForm
          onClose={() => setShowFindCourseForm(false)}
          setShowFindCourseForm={setShowFindCourseForm}
        />
      )}
    </div>
  );
}

export default function KMTCCoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900">
          <Header currentPage="kmtc-courses" />
          <main className="flex-1">
            <section className="w-full py-6 sm:py-8 md:py-12 lg:py-16">
              <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
                <CoursesSkeleton />
              </div>
            </section>
          </main>
          <Footer />
        </div>
      }
    >
      <KMTCCoursesPageContent />
    </Suspense>
  );
}