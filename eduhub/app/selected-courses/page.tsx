"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Download, FileText, LogIn, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { generateCoursesPDF } from "@/lib/pdf-generator";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useSelectedCourses } from "@/lib/course-store";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

export default function SelectedCoursesPage() {
  const { selectedCourses, toggleCourseSelection, isLoading: storeLoading } = useSelectedCourses();
  const { user, requirePayment } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Local loading for remove actions (per-course)
  const [removingIds, setRemovingIds] = useState<Set<string | number>>(new Set());

  // Page-level loading (fetch + enrichment)
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPageLoading(false);
      return;
    }

    // Always refresh when user is present (on mount & after login/subscription change)
    const loadData = async () => {
      setPageLoading(true);
      try {
        await useSelectedCourses.getState().refreshFromBackend();
      } catch (err) {
        console.error("Failed to load selected courses:", err);
        toast({
          title: "Loading Failed",
          description: "Could not load your selected courses. Please try again.",
          variant: "destructive",
        });
      } finally {
        setPageLoading(false);
      }
    };

    loadData();
  }, [user, toast]); // Re-run when user changes (login/logout/subscription)

  const handleRemove = async (course: any) => {
    const courseKey = course.selectionId || course.id || course.code;
    if (!courseKey) return;

    setRemovingIds((prev) => new Set([...prev, courseKey]));

    try {
      await toggleCourseSelection(course);
      toast({
        title: "Removed",
        description: `${course.name || "Course"} removed from your selections.`,
      });
    } catch (err) {
      console.error("Remove failed:", err);
      toast({
        title: "Error",
        description: "Failed to remove course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemovingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(courseKey);
        return newSet;
      });
    }
  };

  const handleDownloadPDF = () => {
    if (selectedCourses.length === 0) {
      toast({
        title: "No Courses",
        description: "Select at least one course or programme first.",
        variant: "destructive",
      });
      return;
    }
  
    try {
      generateCoursesPDF(selectedCourses, user?.first_name || "Student");
      toast({
        title: "PDF Downloaded!",
        description: `Your ${selectedCourses.length} selected course${selectedCourses.length !== 1 ? "s/programmes" : ""} are ready.`,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast({
        title: "PDF Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Combined loading state
  const isLoading = pageLoading || storeLoading;

  // ────────────────────────────────────────────────
  // Loading UI (your requested block)
  // ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="flex flex-col items-center gap-4 py-20">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Loading your selected courses...
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // ────────────────────────────────────────────────
  // Main content
  // ────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 md:py-24 lg:py-32 max-w-7xl">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-text">
              My Selected Courses
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-3 text-lg">
              {user
                ? "All your saved courses from universities and KMTC campuses"
                : "Log in to view and manage your selected courses"}
            </p>
          </div>

          {user && selectedCourses.length > 0 && (
            <Button size="lg" onClick={handleDownloadPDF} className="bg-emerald-600 hover:bg-emerald-700">
              <Download className="mr-2 h-5 w-5" />
              Download PDF Of Selected Courses
            </Button>
          )}
        </div>

        {/* USER INFO PANEL */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Status</p>
              {user ? (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Logged in
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-1 text-xs">
                  Guest
                </Badge>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Phone</p>
              <Badge variant="outline" className="mt-1 text-sm">
                {user ? user.phone_number : "Not logged in"}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Points</p>
              <Badge variant="outline" className="mt-1 text-lg font-bold border-emerald-500 text-emerald-600 dark:text-emerald-400">
                {user ? (user.points || "N/A") : "N/A"}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Subscription</p>
              {user ? (
                requirePayment ? (
                  <Badge variant="destructive" className="mt-1 flex items-center gap-1 text-xs">
                    <XCircle className="w-3 h-3" />
                    Inactive
                  </Badge>
                ) : (
                  <Badge variant="default" className="mt-1 bg-emerald-600 flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </Badge>
                )
              ) : (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Login to check
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* GUEST / EMPTY STATE */}
        {!user ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <LogIn className="h-12 w-12 text-gray-500" />
              </div>
              <CardTitle className="text-2xl mb-3">Log in to view your selections</CardTitle>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                Your selected courses are saved on the server. Log in to access them.
              </p>
              <Button size="lg" onClick={() => router.push("/login")} className="bg-emerald-600 hover:bg-emerald-700">
                <LogIn className="mr-2 h-5 w-5" />
                Log In
              </Button>
            </CardContent>
          </Card>
        ) : selectedCourses.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <CardTitle className="text-2xl mb-3">No courses selected yet</CardTitle>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                Start exploring university and KMTC courses and save your favorites here!
              </p>
              <div className="flex gap-4">
                <Button size="lg" asChild className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/courses">Browse Universities</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/kmtc">Browse KMTC</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
              <CardTitle className="text-2xl flex items-center gap-3">
                <FileText className="h-7 w-7" />
                Your Selected Courses
              </CardTitle>
              <p className="text-emerald-100">
                {selectedCourses.length} course{selectedCourses.length !== 1 ? "s" : ""} saved
              </p>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900">
                      <TableHead className="font-bold">Code</TableHead>
                      <TableHead className="font-bold">Course Name</TableHead>
                      <TableHead className="font-bold">Institution</TableHead>
                      <TableHead className="font-bold">Category</TableHead>
                      <TableHead className="font-bold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCourses.map((course) => {
                      const courseKey = course.selectionId || course.id || course.code;
                      const isRemoving = removingIds.has(courseKey);

                      return (
                        <TableRow
                          key={courseKey}
                          className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                        >
                          <TableCell className="font-mono font-semibold">
                            {course.code || "N/A"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{course.name || "Unnamed Course"}</p>
                              {course.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {course.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {course.university_name || course.university?.name || course.institution || "KMTC"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
                              {course.qualification || "Diploma/Certificate"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemove(course)}
                              disabled={isRemoving}
                            >
                              {isRemoving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}