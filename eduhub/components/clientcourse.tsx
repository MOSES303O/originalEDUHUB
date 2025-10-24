// frontend/components/clientcourse.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Course } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft,Check,Heart, BookOpen, Building, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchCourseById } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedCourses } from "@/lib/course-store";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { AuthenticationModal } from "@/components/authentication-modal";

interface CourseDetailClientProps {
  initialCourse: Course | null;
  initialCampus: string;
  initialError: string | null;
}

export default function CourseDetailClient({ initialCourse, initialCampus, initialError }: CourseDetailClientProps) {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading, requirePayment } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(initialCourse);
  const [courseCampus, setCourseCampus] = useState<string>(initialCampus);
  const [loading, setLoading] = useState(!initialCourse && !initialError);
  const [error, setError] = useState<string | null>(initialError);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { addCourse, isCourseSelected, toggleCourseSelection } = useSelectedCourses();

  useEffect(() => {
    async function loadCourseDetails() {
      if (initialCourse || initialError) return;
      try {
        setLoading(true);
        const data = await fetchCourseById(courseId);
        if (!data) {
          setError("Course not found. Please try another course.");
          return;
        }
        setCourse(data);
        setCourseCampus(data.university.campus || 'Not specified');
      } catch (err: any) {
        console.error("Error loading course details:", JSON.stringify({
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        }, null, 2));
        let errorMessage = "Failed to load course details. Please try again later.";
        try {
          const parsedError = JSON.parse(err.message || "{}");
          errorMessage = parsedError.data?.message || parsedError.message || errorMessage;
        } catch {
          // Fallback
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      loadCourseDetails();
    }
  }, [courseId, initialCourse, initialError]);

  useEffect(() => {
    if (!authLoading && (!user || requirePayment)) {
      const timer = setTimeout(() => setShowAuthModal(true), 120000);
      return () => clearTimeout(timer);
    } else {
      setShowAuthModal(false);
    }
  }, [authLoading, user, requirePayment]);

  const handleApplyNow = async () => {
    try {
      if (course && !isCourseSelected(course.id)) {
        await addCourse(course);
        toast({
          title: "Course Selected",
          description: `${course.name} has been added to your selected courses.`,
          duration: 3000,
        });
      }
      if (!user || requirePayment) {
        setShowAuthModal(true);
        toast({
          title: "Authentication Required",
          description: "Please log in or complete payment to apply for this course.",
          variant: "destructive",
          duration: 3000,
        });
      } else {
        router.push("/selected-courses");
      }
    } catch (err) {
      console.error("Error applying for course:", JSON.stringify(err, null, 2));
      toast({
        title: "Error",
        description: "Failed to apply for course. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleToggleSelection = async () => {
    try {
      if (course) {
        await toggleCourseSelection(course);
        toast({
          title: isCourseSelected(course.id) ? "Course Removed" : "Course Added",
          description: `${course.name} has been ${isCourseSelected(course.id) ? "removed from" : "added to"} your selected courses.`,
          duration: 3000,
        });
      }
    } catch (err) {
      console.error("Error toggling course selection:", JSON.stringify(err, null, 2));
      toast({
        title: "Error",
        description: "Failed to update course selection. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="flex-1">
          <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-start gap-4 mb-8">
                <Button variant="outline" size="sm" asChild className="mb-2">
                  <Link href="/courses">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Courses
                  </Link>
                </Button>
                <div className="w-full space-y-4">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-10 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-7 w-40" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-7 w-48" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-6 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-7 w-36" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-7 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-10 w-full mb-4" />
                      <Skeleton className="h-4 w-3/4" />
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

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="flex-1">
          <div className="container px-4 md:px-6 py-12">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">Error Loading Course</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
              <div className="flex gap-4">
                <Button asChild variant="outline">
                  <Link href="/courses">Back to Courses</Link>
                </Button>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="flex-1">
          <div className="container px-4 md:px-6 py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <h1 className="text-2xl font-bold mb-4">Course not found</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                The course you're looking for doesn't exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/courses">Browse All Courses</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={!!(user && !requirePayment)} />}
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-start gap-4 mb-8">
              <Button variant="outline" size="sm" asChild className="mb-2">
                <Link href="/courses">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Courses
                </Link>
              </Button>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full">
                <div>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{course.name}</h1>
                  <p className="text-xl text-gray-500 mt-2">{course.university.name}</p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-2">
                  <Button
                    variant={isCourseSelected(course.id) ? "default" : "outline"}
                    className={`flex items-center gap-2 ${isCourseSelected(course.id) ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                    onClick={handleToggleSelection}
                  >
                    {isCourseSelected(course.id) ? (
                      <>
                        <Check className="h-4 w-4" />
                        Selected
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4" />
                        Select Course
                      </>
                    )}
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApplyNow}>
                    Apply Now
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      {course.description ? (
                        course.description.split("\n\n").map((paragraph: string, index: number) => (
                          <p key={index}>{paragraph}</p>
                        ))
                      ) : (
                        <p className="text-gray-400">No course description available.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Entry Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Minimum Grade</h3>
                        <p className="text-gray-700 dark:text-gray-300">{course.minimum_grade || "Not specified"}</p>
                      </div>
                      {course.required_subjects && course.required_subjects.length > 0 ? (
                        <div>
                          <h3 className="font-semibold mb-2">Required Subjects</h3>
                          <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                            {course.required_subjects.map((req, index) => (
                              <li key={index}>
                                {req.subject.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-gray-700 dark:text-gray-300">No specific subject requirements.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Career Prospects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{course.career_prospects || "Not specified"}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">Category</p>
                          <p className="font-medium">{course.category || "Not specified"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">Campus</p>
                          <p className="font-medium">{courseCampus}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">Intake</p>
                          <p className="font-medium">{course.startDate || "Not specified"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">Tuition Fee (Per Year)</p>
                          <p className="font-medium">{course.tuition_fee_per_year ? `KES ${course.tuition_fee_per_year}` : "Not specified"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Apply Now</CardTitle>
                    <CardDescription>Ready to start your journey?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleApplyNow}>
                      Start Application
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      Have questions about this course? Contact our admissions team for assistance.
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/contact">Contact Admissions</Link>
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