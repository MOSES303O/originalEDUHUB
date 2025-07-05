"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Course } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  GraduationCapIcon as GradCap,
  Building,
  Calendar,
  Clock,
  Heart,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchCourseById, matchUniversityCampus } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedCourses } from "@/lib/course-store";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useAuth } from "@/lib/auth-context";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseCampus, setCourseCampus] = useState<string>("Not specified");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addCourse, isCourseSelected, toggleCourseSelection } = useSelectedCourses();

  useEffect(() => {
    async function loadCourseDetails() {
      try {
        setLoading(true);
        const data = await fetchCourseById(courseId);

        if (!data) {
          setError("Course not found. Please try another course.");
          return;
        }

        setCourse(data);
      } catch (err) {
        console.error("Error loading course details:", err);
        setError("Failed to load course details. Please try again later.");
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    }

    async function fetchCampus() {
      try {
        const campus = await matchUniversityCampus(courseId);
        setCourseCampus(campus);
      } catch (error) {
        console.error("Failed to fetch campus:", error);
        setCourseCampus("Not specified");
      }
    }

    if (courseId) {
      loadCourseDetails();
      fetchCampus();
    }
  }, [courseId]);

  const handleApplyNow = () => {
    try {
      if (course && !isCourseSelected(course.id)) {
        addCourse(course);
        toast({
          title: "Course Selected",
          description: `${course.name} has been added to your selected courses.`,
          duration: 3000,
        });
      }

      if (!user) {
        router.push("/signup");
      } else if (!user.hasPaid) {
        router.push("/signup");
      } else {
        router.push("/selected-courses");
      }
    } catch (err) {
      console.error("Error applying for course:", err);
      toast({
        title: "Error",
        description: "Failed to apply for course. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleToggleSelection = () => {
    try {
      if (course) {
        toggleCourseSelection(course);
        if (!isCourseSelected(course.id)) {
          toast({
            title: "Course Added",
            description: `${course.name} has been added to your selected courses.`,
            duration: 3000,
          });
        } else {
          toast({
            title: "Course Removed",
            description: `${course.name} has been removed from your selected courses.`,
            duration: 3000,
          });
        }
      }
    } catch (err) {
      console.error("Error toggling course selection:", err);
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
      <div className="flex min-h-screen flex-col">
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
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
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
                        <div className="flex flex-wrap gap-2">
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-6 w-24" />
                        </div>
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
      <div className="flex min-h-screen flex-col">
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
      <div className="flex min-h-screen flex-col">
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 ">
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
                  <Badge className="mb-2">{course.id}</Badge>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{course.name}</h1>
                  <p className="text-xl text-gray-500 mt-2">{course.university_name}</p>
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
                        course.description.split("\n\n").map((paragraph: string, index: number) => {
                          if (paragraph.startsWith("- ")) {
                            const items = paragraph.split("\n- ");
                            return (
                              <ul key={index} className="my-4 list-disc pl-5">
                                {items.map((item, i) => (
                                  <li key={i}>{item.replace("- ", "")}</li>
                                ))}
                              </ul>
                            );
                          }
                          return <p key={index}>{paragraph}</p>;
                        })
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
                        <h3 className="font-semibold mb-2">Required Subjects</h3>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(course.required_subjects) && course.required_subjects.length > 0 ? (
                            course.required_subjects.map((item: { subject: { name: string } }, index: number) => (
                              <Badge key={index} variant="secondary">
                                {item.subject.name}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No required subjects listed.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Minimum Points Required</h3>
                        {course.minimum_grade ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                            {course.minimum_grade} points
                          </Badge>
                        ) : (
                          <p className="text-sm text-muted-foreground">No points specified.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Career Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {course.career_prospects ? (
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {course.career_prospects.split(",").map((career: string) => (
                          <li key={career.trim()} className="flex items-center gap-2">
                            <div className="rounded-full bg-emerald-100 p-1 dark:bg-emerald-900">
                              <svg
                                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                                fill="none"
                                height="24"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                width="24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                            {career.trim()}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No career prospects listed.</p>
                    )}
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
                          <p className="text-sm text-gray-500">Course Code</p>
                          <p className="font-medium">{course.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <GradCap className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">duration</p>
                          <p className="font-medium">{course.duration_years} years</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">Start Date</p>
                          <p className="font-medium">{course.startDate || "Not specified"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">Application Deadline</p>
                          <p className="font-medium">{course.applicationDeadline || "Not specified"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm text-gray-500">Available Campuses</p>
                          <p className="font-medium">{courseCampus}</p>
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
                    <p className="text-sm text-gray-500 mt-4">
                      Application deadline: {course.applicationDeadline || "Not specified"}
                    </p>
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