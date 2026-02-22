"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Course } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Heart, BookOpen, Building, Calendar, DollarSign, GraduationCap, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedCourses } from "@/lib/course-store";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { AuthenticationModal } from "@/components/authentication-modal";
import { fetchCourseById } from "@/lib/api";

interface CourseDetailClientProps {
  initialCourse: Course | null;
  initialError: string | null;
}

export default function CourseDetailClient({ initialCourse, initialError }: CourseDetailClientProps) {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading, requirePayment } = useAuth();
  const { toast } = useToast();

  const { toggleCourseSelection, selectedCourses } = useSelectedCourses();

  const [course, setCourse] = useState<Course | null>(initialCourse);
  const [loading, setLoading] = useState(!initialCourse && !initialError);
  const [error, setError] = useState<string | null>(initialError);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Reactive selection check — updates automatically when store changes
  const isSelected = course?.code
    ? selectedCourses.some((c) => String(c.code).trim().toLowerCase() === String(course.code).trim().toLowerCase())
    : false;

  useEffect(() => {
    async function loadCourseDetails() {
      if (initialCourse || initialError) return;
      try {
        setLoading(true);
        const data = await fetchCourseById(courseId);
        if (!data) {
          setError("Course not found.");
          return;
        }
        setCourse(data);
      } catch (err) {
        console.error("Error loading course:", err);
        setError("Failed to load course details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (courseId) loadCourseDetails();
  }, [courseId, initialCourse, initialError]);

  useEffect(() => {
    if (!authLoading && (!user || requirePayment)) {
      const timer = setTimeout(() => setShowAuthModal(true), 120000);
      return () => clearTimeout(timer);
    } else {
      setShowAuthModal(false);
    }
  }, [authLoading, user, requirePayment]);

  const handleToggleSelection = async () => {
    if (!user || requirePayment) {
      setShowAuthModal(true);
      return;
    }

    if (!course || !course.code) {
      toast({
        title: "Error",
        description: "Course code is missing.",
        variant: "destructive",
      });
      return;
    }

    const wasSelected = isSelected;

    try {
      await toggleCourseSelection(course);
      console.log("Toggling selection for course code:", course.code, "current selected:", isSelected);

      toast({
        title: wasSelected ? "Removed" : "Selected",
        description: `${course.name} has been ${wasSelected ? "removed from" : "added to"} your selections.`,
        duration: 3000,
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.non_field_errors?.[0] || err.message || "";

      if (errorMsg.toLowerCase().includes("already selected") || errorMsg.includes("exists")) {
        toast({
          title: "Already Selected",
          description: `${course.name} is already in your list.`,
          duration: 3000,
        });
        return;
      }

      toast({
        title: "Update Failed",
        description: errorMsg || "Could not update selection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyNow = () => {
    if (!user || requirePayment) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in or complete payment to apply.",
        variant: "destructive",
      });
      return;
    }

    if (!course || !course.code) {
      toast({
        title: "Error",
        description: "Course code is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!isSelected) {
      toggleCourseSelection(course).catch(() => {
        toast({
          title: "Failed",
          description: "Could not select course.",
          variant: "destructive",
        });
      });
    }

    router.push("/selected-courses");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="flex-1 py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-8 w-40" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-8 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24" />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-8 w-36" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-40" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
              {error || "Course Not Found"}
            </h2>
            <Button asChild>
              <Link href="/courses">Back to Courses</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Extract nested data from API response
  const program = course.program || {};
  const university = course.university || {};

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />
      {showAuthModal && (
        <AuthenticationModal
          onClose={() => setShowAuthModal(false)}
          canClose={!!(user && !requirePayment)}
        />
      )}
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
          <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-12">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  {program.name || course.name}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mt-3">
                  {course.university_name}
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <Badge variant="secondary">{course.code}</Badge>
                  <Badge className="capitalize">{program.category || course.category || "General"}</Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  variant={isSelected ? "destructive" : "outline"}
                  className={
                    isSelected
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  }
                  onClick={handleToggleSelection}
                >
                  {isSelected ? (
                    <>
                      <Trash2 className="h-5 w-5" />
                      Deselect Course
                    </>
                  ) : (
                    <>
                      <Heart className="h-5 w-5" />
                      Select Course
                    </>
                  )}
                </Button>
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                  <a href="https://chat.whatsapp.com/LJxPGhfopYCD82r5AY0mHy?mode=gi_t" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">  
                    Apply Now
                    </a>                
                </Button>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="md:col-span-2 space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Program Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      {program.details || course.details || course.description || "No description available for this course."}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Entry Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Minimum Cut-off Grade</h3>
                      <p className="text-2xl font-bold text-emerald-600">
                        {course.minimum_grade || "N/A"}
                      </p>
                    </div>

                    {course.required_subjects && course.required_subjects.length > 0 ? (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Required Subjects</h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {course.required_subjects.map((req: any, i: number) => (
                          <li key={i} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {req.subject?.label || req.subject?.value || req.subject?.name || "Unknown Subject"}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Min Grade: {req.minimum_grade || "N/A"}
                              </Badge>
                              {req.is_mandatory && (
                                <Badge variant="default" className="text-xs bg-red-500">
                                  Mandatory
                                </Badge>
                              )}
                            </div>
                            {/* You can remove or keep cluster_requirements if it's useful */}
                            {/* {req.cluster_requirements && ( ... )} */}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-gray-500">No specific subject requirements listed.</p>
                  )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Career Prospects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {course.career_prospects && course.career_prospects.trim() !== "" ? (
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-2">
                        <p className="font-medium">Graduates can pursue careers as:</p>
                        {course.career_prospects
                          .split(',')
                          .map(item => item.trim())
                          .filter(item => item.length > 0)
                          .map((career, index) => (
                            <p key={index}>• {career}</p>
                          ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        Information not available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Program Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Clock className="h-6 w-6 text-emerald-600" />
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="font-semibold">
                          {course.duration_years || program.typical_duration_years || "N/A"} years
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <DollarSign className="h-6 w-6 text-emerald-600" />
                      <div>
                        <p className="text-sm text-gray-500">Tuition Fee (Per Year)</p>
                        <p className="font-semibold text-xl">
                          {course.tuition_fee_per_year
                            ? `KES ${Number(course.tuition_fee_per_year).toLocaleString()}`
                            : "Contact university"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Building className="h-6 w-6 text-emerald-600" />
                      <div>
                        <p className="text-sm text-gray-500">University</p>
                        <p className="font-semibold">
                          {course.university_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {course.university?.city || "Location not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-6 w-6 text-emerald-600" />
                      <div>
                        <p className="text-sm text-gray-500">Intake Months</p>
                        <p className="font-semibold">
                          {course.intake_months && course.intake_months.length > 0
                            ? course.intake_months.map(m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()).join(", ")
                            : "Not specified"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ready to Apply?</CardTitle>
                    <CardDescription>Join thousands of students</CardDescription>
                  </CardHeader>
                  <CardContent>                    
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                    <a href="https://chat.whatsapp.com/LJxPGhfopYCD82r5AY0mHy?mode=gi_t" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">  
                      Start Your Application
                    </a>                
                </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}