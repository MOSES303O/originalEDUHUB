// frontend/app/selected-courses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Heart, Download } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { PDFNotification } from "@/components/pdf-notification";
import { generateCoursesPDF } from "@/lib/pdf-generator"; // Use updated generateCoursesPDF
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useSelectedCourses, initializeSelectedCourses } from "@/lib/course-store";
import { useAuth } from "@/lib/auth-context";
import { AuthenticationModal } from "@/components/authentication-modal";
import { removeSelectedCourse } from "@/lib/api";
import { Course } from "@/types";

export default function SelectedCoursesPage() {
  const { selectedCourses, setSelectedCourses } = useSelectedCourses();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [courseToRemove, setCourseToRemove] = useState<string | null>(null);
  const [showPdfNotification, setShowPdfNotification] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch selected courses for authenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    } else if (user) {
      initializeSelectedCourses().catch((err) => {
        console.error("Failed to initialize selected courses:", JSON.stringify(err, null, 2));
        toast({
          title: "Error",
          description: "Failed to fetch selected courses.",
          variant: "destructive",
          duration: 3000,
        });
      });
    }
  }, [authLoading, user, toast]);

  const handleRemoveCourse = async (courseId: string, selectionId?: string | number) => {
    if (!selectionId) {
      toast({
        title: "Error",
        description: "Cannot remove course: selection ID not found.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    try {
      await removeSelectedCourse(selectionId);
      setSelectedCourses(selectedCourses.filter((course) => course.id !== courseId));
      toast({
        title: "Course Removed",
        description: "The course has been removed from your selected courses.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to remove course:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: "Failed to remove the course.",
        variant: "destructive",
        duration: 3000,
      });
    }
    setCourseToRemove(null);
  };

  const handleClosePdfNotification = () => {
    setShowPdfNotification(false);
    localStorage.setItem("hasSeenPdfNotification", "true");
  };

  const handleDownloadPdf = () => {
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to download your selected courses as a PDF.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    if (selectedCourses.length === 0) {
      toast({
        title: "No Courses Selected",
        description: "Please select at least one course to generate a PDF.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    try {
      generateCoursesPDF(selectedCourses, user.first_name || "Student");
      toast({
        title: "PDF Generated",
        description: "Your selected courses have been downloaded as a PDF.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error generating PDF:", JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={false} />}
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
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl flex items-center gap-3">
                    Selected Courses
                    <Heart className="h-8 w-8 text-emerald-600" />
                  </h1>
                  <p className="text-gray-500 md:text-xl">Courses you've shown interest in</p>
                </div>
                {selectedCourses.length > 0 && (
                  <Button onClick={handleDownloadPdf} className="mt-4 md:mt-0 bg-emerald-600 hover:bg-emerald-700">
                    <Download className="mr-2 h-4 w-4" />
                    Download as PDF
                  </Button>
                )}
              </div>
            </div>

            {selectedCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Heart className="h-16 w-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold mb-2">No Courses Selected</h2>
                <p className="text-gray-500 mb-6">You haven't selected any courses yet.</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/courses">Browse Courses</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {selectedCourses.map((course: Course) => (
                  <Card key={course.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Badge className="mb-2">{course.id}</Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setCourseToRemove(course.id)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Course</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove "{course.name}" from your selected courses?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setCourseToRemove(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleRemoveCourse(course.id, course.selectionId)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <CardTitle className="text-xl">{course.name}</CardTitle>
                      <CardDescription>{course.university_name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Course Code:</span>
                          <span className="text-sm">{course.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Required Points:</span>
                          <span className="text-sm">{course.minimum_grade}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">{course.description}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" asChild>
                        <Link href={`/courses/${course.id}`}>View Details</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      {showPdfNotification && <PDFNotification onClose={handleClosePdfNotification} onDownload={handleDownloadPdf} />}
    </div>
  );
}