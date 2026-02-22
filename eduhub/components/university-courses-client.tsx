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
import { Course } from "@/types";
import { useDebounce } from "use-debounce";
import { fetchCoursesByUniversity } from "@/lib/api";

interface UniversityCoursesClientProps {
  initialUniversity: { name: string } | null;
  universityCode: string;
  initialCourses: Course[];
  initialError?: string | null;
}

export default function UniversityCoursesClient({
  initialUniversity,
  universityCode,
  initialCourses,
  initialError = null,
}: UniversityCoursesClientProps) {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [courses, setCourses] = useState<Course[]>(initialCourses); // Start with server fallback
  const [loading, setLoading] = useState(false); // Client fetch starts false if using initial
  const [error, setError] = useState<string | null>(initialError);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);

  // Fetch fresh authenticated data after auth is ready
  useEffect(() => {
    async function refreshCourses() {
      if (authLoading) return;

      setLoading(true);
      setError(null);

      try {
        const freshCourses = await fetchCoursesByUniversity(universityCode);
        setCourses(freshCourses.length > 0 ? freshCourses : initialCourses); // Prefer fresh
      } catch (err: any) {
        console.error("Client fetch failed:", err);
        setError("Failed to refresh courses with your qualification status.");
        // Keep initialCourses as fallback
      } finally {
        setLoading(false);
      }
    }

    refreshCourses();
  }, [universityCode, authLoading, user]); // Re-run on auth/user change

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
    const searchLower = debouncedSearchTerm.toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        searchLower === "" ||
        course.name?.toLowerCase().includes(searchLower) ||
        course.code ||
        course.university?.name?.toLowerCase().includes(searchLower);

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
            Available Courses  {initialUniversity?.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {loading ? "Loading courses..." : `Browse through ${courses.length} course${courses.length !== 1 ? "s" : ""} offered by ${initialUniversity?.name}`}
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
              disabled={loading}
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={loading}>
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

        {loading || authLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading courses...</p>
          </div>
        ) : error ? (
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
                  <TableHead>Qualification</TableHead>
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