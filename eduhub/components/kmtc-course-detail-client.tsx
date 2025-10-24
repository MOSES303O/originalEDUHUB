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
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { generateCoursesPDF } from "@/lib/pdf-generator";
import { KMTCCourse } from "@/types";
import { useDebounce } from "use-debounce";

interface KMTCCoursesClientProps {
  initialCourses: KMTCCourse[];
  initialCampusName: string;
  initialError: string | null;
  campusCode: string;
}

export default function KMTCCoursesClient({
  initialCourses,
  initialCampusName,
  initialError,
  campusCode,
}: KMTCCoursesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [courses, setCourses] = useState<KMTCCourse[]>(initialCourses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [campusName, setCampusName] = useState<string>(initialCampusName);

  // Handle Get Started button click
  const handleGetStarted = () => {
    console.log("[KMTCCoursesClient] Get Started clicked, user:", user);
    if (!user) {
      console.log("[KMTCCoursesClient] User not logged in, showing auth modal");
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else if (!user.hasPaid) {
      console.log("[KMTCCoursesClient] User not paid, showing auth modal");
      setShowAuthModal(true);
      toast({
        title: "Payment Required",
        description: "Please complete your payment to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      console.log("[KMTCCoursesClient] User authenticated and paid, showing FindCourseForm");
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
      console.error("[KMTCCoursesClient] Error generating PDF:", JSON.stringify(err, null, 2));
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

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
      console.log("[KMTCCoursesClient] User not authenticated or not paid, showing auth modal");
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header currentPage="kmtc" onGetStarted={handleGetStarted} user={user} />
      <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl py-6 sm:py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Button
            variant="outline"
            className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent text-xs sm:text-sm"
            asChild
          >
            <Link href="/kmtc">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Back to KMTC Campuses
            </Link>
          </Button>
          <div className="flex gap-2 sm:gap-4">
            <Button
              variant="outline"
              className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent text-xs sm:text-sm"
              onClick={() => router.push("/selected-courses")}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Selected Courses ({selectedCourses.size})
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm"
              onClick={handleGeneratePDF}
            >
              Download PDF
            </Button>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-2">Available Courses - {campusName}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base md:text-lg">
            Browse through courses offered by {campusName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              placeholder="Search courses by name, code, department, or description..."
              value={searchTerm}
              onChange={(e) => {
                e.preventDefault();
                setSearchTerm(e.target.value);
              }}
              className="pl-10 h-9 sm:h-10 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-y-auto">
              <SelectItem value="all" className="text-xs sm:text-sm">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department} className="text-xs sm:text-sm">
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="relative overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm card-hover">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
                  <TableHead className="text-xs sm:text-sm">Course Code</TableHead>
                  <TableHead className="text-xs sm:text-sm">Course Name</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Qualification</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Description</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Select</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Actions</TableHead>
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