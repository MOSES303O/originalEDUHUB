// frontend/app/universities/[id]/courses/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CourseRow } from "@/components/course-row";
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
import { useAuth } from "@/lib/auth-context";
import { fetchCoursesByUniversity, fetchUniversities } from "@/lib/api";
import { Course } from "@/types";

export default function UniversityCoursesPage() {
  const params = useParams();
  const universityCode = params.id as string; // Use params.id
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [universityName, setUniversityName] = useState<string>("Unknown University");

  useEffect(() => {
    if (user && !user.hasPaid) {
      console.log("[UniversityCoursesPage] User not paid, showing auth modal");
      setShowAuthModal(true);
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        if (!universityCode || typeof universityCode !== "string") {
          throw new Error("Invalid university code");
        }

        // Fetch university name
        console.log("[loadData] Fetching university for universityCode:", universityCode);
        const uniData = await fetchUniversities({ code: universityCode });
        console.log("[loadData] Fetched universities:", JSON.stringify(uniData, null, 2));
        if (!Array.isArray(uniData) || uniData.length === 0) {
          throw new Error("University not found");
        }
        const university = uniData[0];
        setUniversityName(university.name || "Unknown University");

        // Fetch courses
        const params: Record<string, string> = {};
        if (searchTerm) params.search = searchTerm;
        if (departmentFilter !== "all") params.department = departmentFilter;

        console.log("[loadData] Fetching courses for universityCode:", universityCode, "with params:", params);
        const coursesData = await fetchCoursesByUniversity(universityCode, params);
        console.log("[loadData] Fetched courses:", JSON.stringify(coursesData, null, 2));

        if (!Array.isArray(coursesData)) {
          console.warn("[loadData] Invalid courses data received:", coursesData);
          throw new Error("Invalid courses data received from API");
        }

        if (coursesData.length === 0) {
          console.warn("[loadData] No courses available for universityCode:", universityCode);
          setCourses([]);
        } else {
          setCourses(coursesData);
        }
      } catch (err: unknown) {
        const errorDetails = {
          message: err instanceof Error ? err.message : String(err || "Unknown error"),
          stack: err instanceof Error ? err.stack : undefined,
        };
        console.error("[loadData] Error loading courses:", JSON.stringify(errorDetails, null, 2));
        setError(errorDetails.message || "Failed to load courses. Please try again later.");
        setCourses([]);
      } finally {
        setLoading(false);
        console.log("[loadData] Final state:", {
          loading,
          error,
          universityName,
          courses: JSON.stringify(courses, null, 2),
        });
      }
    }

    loadData();
  }, [universityCode, user, searchTerm, departmentFilter]);

  const departments = useMemo(() => {
    const uniqueDepartments = [...new Set(courses.map((course) => course.department).filter((dept): dept is string => !!dept))];
    return uniqueDepartments.sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        searchTerm === "" ||
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.department && course.department.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDepartment = departmentFilter === "all" || course.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [courses, searchTerm, departmentFilter]);

  const toggleCourseSelection = (courseId: string) => {
    if (!user || !user.hasPaid) {
      toast({
        title: "Authentication Required",
        description: "Please upgrade your account to select courses.",
        variant: "destructive",
        duration: 3000,
      });
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
        <Header currentPage="universities" />
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
        <Header currentPage="universities" />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center p-8 rounded-md border bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-300">
            <p>{error}</p>
            <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
          <div className="text-center mt-4">
            <Link href="/university">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Back to Universities
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
      <Header currentPage="universities" />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/university">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Universities
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
            onClick={() => router.push("/selected-courses")}
          >
            <Heart className="w-4 h-4 mr-2" />
            Selected Courses ({selectedCourses.size})
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Available Courses - {universityName}</h1>
          <p className="text-gray-600 dark:text-gray-400">Browse through courses offered by {universityName}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search courses by name, code, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
                Clear
              </Button>
            )}
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
                  <TableHead className="text-center">Required Grade</TableHead>
                  <TableHead className="text-center">Qualification</TableHead>
                  <TableHead className="text-center">Select</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
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
      <Footer />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={false} />}
    </div>
  );
}