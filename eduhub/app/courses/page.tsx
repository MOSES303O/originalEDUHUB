"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchCourses } from "@/lib/api";
import apiClient from "@/lib/api";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { Course } from "@/types";
import { useSelectedCourses } from "@/lib/course-store";
import { useToast } from "@/hooks/use-toast";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { CourseRow } from "@/components/course-row";
import { debounce } from "lodash";
import { UserInfoPanel } from "@/components/panel";

export default function CoursesPage() {
  const [coursesData, setCoursesData] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClusterPoints, setEditingClusterPoints] = useState(false);
  const [tempClusterPoints, setTempClusterPoints] = useState("00.000");

  const router = useRouter();
  const { 
    user, 
    loading: authLoading, 
    requirePayment, 
    setUser,           // ← FIXED: now destructured correctly
    validateToken 
  } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { selectedCourses } = useSelectedCourses();

  const userPoints = Number(searchParams.get("points") || "0");
  const subjectParams = useMemo(() => searchParams.getAll("subjects"), [searchParams]);

  const setSearchTermDebounced = useMemo(
    () => debounce((value: string) => setSearchTerm(value), 300),
    []
  );

  const saveClusterPoints = async () => {
    const newValue = parseFloat(tempClusterPoints);

    if (isNaN(newValue) || newValue < 0 || newValue > 84) {
      toast({
        title: "Invalid Value",
        description: "Cluster points must be between 0.000 and 84.000",
        variant: "destructive",
      });
      setTempClusterPoints("00.000");
      setEditingClusterPoints(false);
      return;
    }

    const payload = { cluster_points: newValue.toFixed(3) };
    console.log("Sending PATCH:", payload);

    try {
      await apiClient.patch("/auth/profile/update/", payload);
      console.log("PATCH RESPONSE FROM BACKEND:", apiClient.patch("/auth/profile/update/", payload));
      // Optimistic UI update with proper typing
      setUser((prev: any) => ({
        ...prev,
        cluster_points: newValue.toFixed(3),
      }));

      // Full backend sync
      await validateToken();

      toast({
        title: "Saved",
        description: `Cluster points set to ${newValue.toFixed(3)}`,
      });
      setEditingClusterPoints(false);
    } catch (err: any) {
      console.error("PATCH error:", err.response?.data || err.message);
      toast({
        title: "Failed",
        description: "Could not save cluster points",
        variant: "destructive",
      });
    }
  };

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
        description: "Please complete your payment to access full features.",
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

        const subjects = subjectParams
          .map((s) => s.split(":")[0])
          .filter(Boolean);

        const params: Record<string, any> = {};
        if (subjects.length > 0) params.subjects = subjects;
        if (userPoints > 0) params.min_points = userPoints.toString();

        const data = await fetchCourses(params);
        setCoursesData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Load data error:", err);
        setError("Failed to load courses. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [subjectParams, userPoints, user, authLoading, requirePayment]);

  useEffect(() => {
    if (!authLoading && (!user || requirePayment)) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [authLoading, user, requirePayment]);

  const filteredCourses = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return coursesData.filter((course) => {
      return (
        searchTerm === "" ||
        (course.name && course.name.toLowerCase().includes(searchLower)) ||
        (course.code) ||
        (course.university?.name && course.university.name.toLowerCase().includes(searchLower))
      );
    });
  }, [coursesData, searchTerm]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header currentPage="courses" onGetStarted={handleGetStarted} user={user} />
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

              <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Available Courses
                  </h1>
                  <p className="text-gray-500 md:text-xl mt-2">
                    Browse through our comprehensive list of university programs
                  </p>
                </div>

                <div className="flex flex-col gap-4 md:items-end">
                  {/* USER INFO PANEL — ONLY FOR LOGGED IN USERS */}
                  {user && <UserInfoPanel className="w-full md:w-auto" />}

                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-full md:w-auto"
                    onClick={() => {
                      if (!user || requirePayment) {
                        setShowAuthModal(true);
                        toast({
                          title: !user ? "Login Required" : "Subscription Required",
                          description: !user
                            ? "Please log in to view your selected courses."
                            : "Complete your subscription to access your selections.",
                          variant: "destructive",
                          duration: 4000,
                        });
                      } else {
                        router.push("/selected-courses");
                      }
                    }}
                  >
                    <Heart className="h-4 w-4" />
                    {user && !requirePayment
                      ? `Selected Courses (${selectedCourses.length})`
                      : "My Selected Courses"}
                  </Button>
                </div>
              </div>

              {/* SEARCH BAR */}
              <div className="flex-1 relative w-full mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search courses by name, code, or university..."
                  value={searchTerm}
                  onChange={(e) => setSearchTermDebounced(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>
            </div>

            {/* LOADING / ERROR / EMPTY / COURSES */}
            {loading || authLoading ? (
              <CoursesSkeleton />
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-12 rounded-md border bg-red-50 text-red-500 dark:bg-red-900/20">
                <p className="mb-4">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-md border bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No courses found matching your criteria.
                </p>
                <Button asChild variant="outline">
                  <Link href="/">Start a New Search</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Course Code</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Cut-off Points</TableHead>
                      <TableHead>Qualification</TableHead>
                      <TableHead>Select</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.map((course) => (
                      <CourseRow
                        key={course.id}
                        course={course}
                        showUniversity={true}
                        onAuthRequired={() => setShowAuthModal(true)}
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

      {/* MODALS */}
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