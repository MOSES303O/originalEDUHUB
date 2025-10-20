// frontend/components/university-courses-client.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CourseRow } from "@/components/course-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { UniversityWithCourses, Course } from "@/types";
import { useDebounce } from "use-debounce";

interface UniversityCoursesClientProps {
  initialUniversity: UniversityWithCourses | null;
  initialCourses: Course[];
  initialError: string | null;
}

export default function UniversityCoursesClient({
  initialUniversity,
  initialCourses,
  initialError,
}: UniversityCoursesClientProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [courses] = useState<Course[]>(initialCourses);
  const [error] = useState<string | null>(initialError);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [universityName] = useState<string>(initialUniversity?.name || "Unknown University");

  const handleGetStarted = () => {
    console.log("[UniversityCoursesClient] Get Started clicked, user:", user);
    if (!user) {
      console.log("[UniversityCoursesClient] User not logged in, showing auth modal");
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else if (!user.hasPaid) {
      console.log("[UniversityCoursesClient] User not paid, showing auth modal");
      setShowAuthModal(true);
      toast({
        title: "Payment Required",
        description: "Please complete your payment to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      console.log("[UniversityCoursesClient] User authenticated and paid, showing FindCourseForm");
      setShowFindCourseForm(true);
    }
  };

  useEffect(() => {
    if (!user || !user.hasPaid) {
      console.log("[UniversityCoursesClient] User not paid or not logged in, showing auth modal");
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [user]);

  const departments = useMemo(() => {
    const uniqueDepartments = [...new Set(courses.map((course) => course.department).filter((dept): dept is string => !!dept))];
    return uniqueDepartments.sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        course.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (course.code && course.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (course.department && course.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (course.description && course.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const matchesDepartment = departmentFilter === "all" || course.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [courses, debouncedSearchTerm, departmentFilter]);

  if (process.env.NODE_ENV !== "production") {
    console.log("[Render] State:", {
      error,
      universityName,
      coursesLength: courses.length,
      filteredCoursesLength: filteredCourses.length,
    });
  }

  return (
    <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
      <Header currentPage="universities" onGetStarted={handleGetStarted} user={user} />
      <div className="container mx-auto px-4 py-8">
        {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={true} />}
        {showFindCourseForm && (
          <FindCourseForm
            onClose={() => setShowFindCourseForm(false)}
            setShowFindCourseForm={setShowFindCourseForm}
          />
        )}
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
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Available Courses - {universityName}</h1>
          <p className="text-gray-600 dark:text-gray-400">Browse through courses offered by {universityName}</p>
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

        {error ? (
          <div className="flex justify-center items-center p-8 rounded-md border bg-red-50 dark:bg-red-900/20 dark:text-red-300">
            <p>{error}</p>
            <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : filteredCourses.length === 0 ? (
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
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-center">Choose</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
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
      <Footer />
    </div>
  );
}