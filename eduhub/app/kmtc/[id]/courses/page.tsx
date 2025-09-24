"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CourseRow } from "@/components/course-roww";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Heart } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { fetchCoursesByKMTCCampus, fetchKMTCCampuses, fetchSelectedCourses } from "@/lib/api";
import { generateCoursesPDF } from "@/lib/pdf-generator";
import { KMTCCourse } from "@/types";
import { notFound } from "next/navigation";
import { useDebounce } from "use-debounce";

// Opt out of SSG
export const dynamic = "force-dynamic";

export default function KMTCCoursesPage() {
  const params = useParams();
  const campusCode = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [courses, setCourses] = useState<KMTCCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [campusName, setCampusName] = useState<string>("Unknown KMTC Campus");

  // Handle Get Started button click
  const handleGetStarted = () => {
    console.log("[KMTCCoursesPage] Get Started clicked, user:", user);
    if (!user) {
      console.log("[KMTCCoursesPage] User not logged in, showing auth modal");
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else if (!user.hasPaid) {
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

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    try {
      const selectedCoursesData = courses.filter((course) => selectedCourses.has(course.id));
      if (selectedCoursesData.length === 0) {
        toast({
          title: "No Courses Selected",
          description: "Please select at least one course to generate a PDF.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      generateCoursesPDF(selectedCoursesData, user?.phone_number || "Student");
      toast({
        title: "PDF Generated",
        description: "Your course PDF has been downloaded.",
        duration: 3000,
      });
    } catch (err) {
      console.error("[KMTCCoursesPage] Error generating PDF:", JSON.stringify(err, null, 2));
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        if (!campusCode || typeof campusCode !== "string") {
          console.error("[loadData] Invalid campus code:", campusCode);
          notFound();
        }

        // Fetch campus name
        console.log("[loadData] Fetching campus for campusCode:", campusCode);
        const campusData = await fetchKMTCCampuses({ code: campusCode });
        console.log("[loadData] Fetched campuses:", JSON.stringify(campusData, null, 2));
        if (!Array.isArray(campusData) || campusData.length === 0) {
          console.error("[loadData] KMTC campus not found for code:", campusCode);
          notFound();
        }
        if (isMounted) {
          const campus = campusData[0];
          setCampusName(campus.name || "Unknown KMTC Campus");
        }

        // Fetch all courses without search or department params
        console.log("[loadData] Fetching courses for campusCode:", campusCode);
        const coursesData = await fetchCoursesByKMTCCampus(campusCode, {});
        console.log("[loadData] Fetched courses:", JSON.stringify(coursesData, null, 2));

        if (!Array.isArray(coursesData)) {
          console.warn("[loadData] Invalid courses data received:", coursesData);
          throw new Error("Invalid courses data received from API");
        }

        if (isMounted) {
          if (coursesData.length === 0) {
            console.warn("[loadData] No courses available for campusCode:", campusCode);
            setCourses([]);
          } else {
            setCourses(coursesData);
          }
        }
      } catch (err: unknown) {
        const errorDetails = {
          message: err instanceof Error ? err.message : String(err || "Unknown error"),
          stack: err instanceof Error ? err.stack : undefined,
        };
        console.error("[loadData] Error loading courses:", JSON.stringify(errorDetails, null, 2));
        if (isMounted) {
          setError(errorDetails.message || "Failed to load courses. Please try again later.");
          setCourses([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
        console.log("[loadData] Final state:", {
          loading,
          error,
          campusName,
          courses: JSON.stringify(courses, null, 2),
        });
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [campusCode]);

  const departments = useMemo(() => {
    const uniqueDepartments = [...new Set(courses.map((course) => course.department).filter((dept): dept is string => !!dept))];
    return uniqueDepartments.sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        course.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (course.department && course.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (course.description && course.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const matchesDepartment = departmentFilter === "all" || course.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [courses, debouncedSearchTerm, departmentFilter]);

  const toggleCourseSelection = (courseId: string) => {
    if (!user || !user.hasPaid) {
      console.log("[toggleCourseSelection] User not authenticated or not paid, showing auth modal");
      toast({
        title: "Authentication Required",
        description: "Please upgrade your account to select courses.",
        variant: "destructive",
        duration: 3000,
      });
      setShowAuthModal(true);
      return;
    }

    const newSelected = new Set(selectedCourses);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
      toast({
        title: "Course Removed",
        description: `Course ${courses.find((c) => c.id === courseId)?.name || courseId} has been removed from your selected courses.`,
        duration: 3000,
      });
    } else {
      newSelected.add(courseId);
      toast({
        title: "Course Selected",
        description: `Course ${courses.find((c) => c.id === courseId)?.name || courseId} has been added to your selected courses.`,
        duration: 3000,
      });
    }
    setSelectedCourses(newSelected);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
        <Header currentPage="kmtc" onGetStarted={handleGetStarted} user={user} />
        <div className="container mx-auto px-4 py-8">
          <CoursesSkeleton />
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
        <Header currentPage="kmtc" onGetStarted={handleGetStarted} user={user} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center p-8 rounded-md border bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-300">
            <p>{error}</p>
            <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
          <div className="text-center mt-4">
            <Link href="/kmtc">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Back to KMTC Campuses
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
      <Header currentPage="kmtc" onGetStarted={handleGetStarted} user={user} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/kmtc">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to KMTC Campuses
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
              onClick={() => router.push("/selected-courses")}
            >
              <Heart className="w-4 h-4 mr-2" />
              Selected Courses ({selectedCourses.size})
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleGeneratePDF}
            >
              Download PDF
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Available Courses - {campusName}</h1>
          <p className="text-gray-600 dark:text-gray-400">Browse through courses offered by {campusName}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search courses by name, code, department, or description..."
              value={searchTerm}
              onChange={(e) => {
                e.preventDefault();
                setSearchTerm(e.target.value);
              }}
              className="pl-10 h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No courses found matching your criteria.</p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead className="text-center">Qualification</TableHead>
                  <TableHead className="text-center">Description</TableHead>
                  <TableHead className="text-center">Select</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    isSelected={selectedCourses.has(course.id)}
                    onSelect={() => toggleCourseSelection(course.id)}
                    showUniversity={false}
                    universityName={campusName}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Footer />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={true} />}
      {showFindCourseForm && (
        <FindCourseForm
          onClose={() => setShowFindCourseForm(false)}
          setShowFindCourseForm={setShowFindCourseForm}
        />
      )}
    </div>
  );
}