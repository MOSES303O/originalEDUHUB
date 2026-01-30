"use client";

import { useState, useMemo } from "react";
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
import { Course } from "@/types";
import { useDebounce } from "use-debounce";

interface UniversityCoursesClientProps {
  initialUniversity: { name: string } | null;
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [courses] = useState<Course[]>(initialCourses);
  const [error] = useState<string | null>(initialError);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);

  const universityName = initialUniversity?.name || "Unknown University";
  const totalCourses = courses.length;

  const handleGetStarted = () => {
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else if (!user.hasPaid) {
      setShowAuthModal(true);
      toast({
        title: "Payment Required",
        description: "Please complete your payment to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      setShowFindCourseForm(true);
    }
  };

  // Extract unique categories safely
  const categories = useMemo(() => {
    const unique = [
      ...new Set(
        courses
          .map((course) => course.category)
          .filter((cat): cat is string => typeof cat === "string" && cat.trim() !== "")
      ),
    ];
    return unique.sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        course.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        course.code ||
        (course.category && course.category.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" ||
        (course.category && course.category === categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [courses, debouncedSearchTerm, categoryFilter]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header currentPage="universities" onGetStarted={handleGetStarted} user={user} />
      <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl py-6 sm:py-8 md:py-12">
        {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={true} />}
        {showFindCourseForm && (
          <FindCourseForm
            onClose={() => setShowFindCourseForm(false)}
            setShowFindCourseForm={setShowFindCourseForm}
          />
        )}

        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <Link href="/university">
            <Button variant="outline" className="text-xs sm:text-sm">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Back to Universities
            </Button>
          </Link>
        </div>

        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-3">
            Available Courses - {universityName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Browse through {totalCourses} course{totalCourses !== 1 ? "s" : ""} offered by {universityName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by course name, code, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 sm:h-12 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <div className="text-center py-12 rounded-lg border bg-red-50 dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No courses found matching your filters.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Cut-off Grade</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Select</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    showUniversity={false}
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