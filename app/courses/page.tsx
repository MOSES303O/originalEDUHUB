// frontend/app/courses/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchCourses } from "@/lib/api";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { useSelectedCourses, initializeSelectedCourses, type Course } from "@/lib/course-store";
import { useToast } from "@/hooks/use-toast";
import { AuthenticationModal } from "@/components/authentication-modal";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { CourseRow } from "@/components/course-row";

const gradeMap: Record<string, number> = {
  A: 12, "A-": 11, "B+": 10, B: 9, "B-": 8, "C+": 7, C: 6, "C-": 5, "D+": 4, D: 3, "D-": 2, E: 1,
};

export default function CoursesPage() {
  const [coursesData, setCoursesData] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { user, loading: authLoading, requirePayment } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { selectedCourses } = useSelectedCourses();

  const userPoints = Number.parseInt(searchParams.get("points") || "0", 10);
  const userGrade = searchParams.get("grade") || "";
  const subjectParams = useMemo(() => searchParams.getAll("subjects"), [searchParams]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        if (user && !requirePayment) {
          await initializeSelectedCourses();
        } else {
          console.log("No user logged in or payment required, skipping initializeSelectedCourses");
        }

        const subjects = subjectParams
          .map((s) => {
            const [subject] = s.split(":");
            return subject;
          })
          .filter((subject) => subject);

        const params: Record<string, string | string[]> = {};
        if (subjects.length > 0) {
          params.subjects = subjects;
        }
        if (userPoints > 0) {
          params.min_points = userPoints.toString();
        }

        console.log("Fetching courses with params:", params);
        const data = await fetchCourses(params);

        if (!Array.isArray(data)) {
          console.warn("Invalid courses data received:", JSON.stringify(data, null, 2));
          setCoursesData([]);
          return;
        }

        setCoursesData(data);
      } catch (err: any) {
        console.error("Error loading data:", JSON.stringify({
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        }, null, 2));
        let errorMessage = "Failed to load courses. Please try again later.";
        if (err.message?.includes("Failed to fetch selected courses")) {
          try {
            const parsedError = JSON.parse(err.message.replace("Failed to fetch selected courses: ", ""));
            errorMessage = parsedError.data?.message || parsedError.message || errorMessage;
          } catch (parseErr) {
            console.error("Failed to parse error:", parseErr);
          }
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [subjectParams, userPoints, user, authLoading, requirePayment]);

  useEffect(() => {
    if (!authLoading && (!user || requirePayment)) {
      const timer = setTimeout(() => {
        setShowAuthModal(true);
      }, 120000); // 2 minutes (120 seconds)
      return () => clearTimeout(timer);
    } else {
      setShowAuthModal(false);
    }
  }, [authLoading, user, requirePayment]);

  const filteredCourses = useMemo(() => {
    console.log("Filtering courses with searchTerm:", searchTerm);
    return coursesData.filter((course) => {
      const matchesSearch =
        searchTerm === "" ||
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.university_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [coursesData, searchTerm]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={!!(user && !requirePayment)} />}
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
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Available Courses</h1>
                  <p className="text-gray-500 md:text-xl">
                    Browse through our comprehensive list of university courses
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
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
                    <Heart className="h-4 w-4" />
                    Selected Courses ({selectedCourses.length})
                  </Button>
                </div>
              </div>
              <div className="flex-1 relative w-full mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search courses by name, ID, or university..."
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
            ) : filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-md border bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No courses found matching your criteria.</p>
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
                      <TableHead>Course ID</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Required Points</TableHead>
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
    </div>
  );
}