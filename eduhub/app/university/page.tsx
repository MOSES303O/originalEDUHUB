"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { useToast } from "@/hooks/use-toast";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { fetchUniversities, fetchCourseCount } from "@/lib/api";
import { UniversityWithCourses } from "@/types";
import { debounce } from "lodash";
import { UniversityRow } from "@/components/university-row";

function UniversitiesPageContent() {
  const [universities, setUniversities] = useState<UniversityWithCourses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");

  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Debounced search
  const setSearchTermDebounced = useMemo(
    () => debounce((value: string) => setSearchTerm(value), 300),
    []
  );

  // Handle Get Started
  const handleGetStarted = () => {
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      setShowFindCourseForm(true);
    }
  };

  // Auto-show auth modal after 2 mins
  useEffect(() => {
    if (!authLoading && !user) {
      const timer = setTimeout(() => setShowAuthModal(true), 120_000);
      return () => clearTimeout(timer);
    } else {
      setShowAuthModal(false);
    }
  }, [authLoading, user]);

  // Load universities with search + city filter
  useEffect(() => {
    async function loadUniversities() {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string | string[]> = {};
        if (searchTerm) params.search = searchTerm;
        if (cityFilter !== "all") params.city = cityFilter;

        console.log("[loadUniversities] Parameters:", params);
        const data = await fetchUniversities(params);
        console.log("[loadUniversities] Fetched universities:", data);

        if (!Array.isArray(data)) {
          console.error("[loadUniversities] Invalid data received:", data);
          throw new Error("Invalid data received from API");
        }

        const enrichedData = await Promise.all(
          data
            .filter((uni: any) => {
              if (!uni.id || !uni.code || typeof uni.code !== "string") {
                console.warn("[loadUniversities] Skipping invalid university:", uni);
                return false;
              }
              return true;
            })
            .map(async (uni: any) => {
              try {
                const courseCount = await fetchCourseCount(uni.code);
                console.log(`[loadUniversities] Course count for ${uni.code}:`, courseCount);

                return {
                  ...uni,
                  available_courses: courseCount,
                  courseCount: courseCount,
                  departments: [],
                  establishedYear: uni.established_year ?? "Unknown",
                  accreditation: uni.accreditation ?? "N/A",
                  faculties: uni.faculties ?? [],
                } as UniversityWithCourses;
              } catch (err) {
                console.error(`[loadUniversities] Error enriching ${uni.code}:`, JSON.stringify(err, null, 2));
                return {
                  ...uni,
                  available_courses: 0,
                  courseCount: 0,
                  departments: [],
                  establishedYear: "Unknown",
                  accreditation: uni.accreditation ?? "N/A",
                  faculties: [],
                } as UniversityWithCourses;
              }
            })
        );

        console.log("[loadUniversities] Enriched universities:", enrichedData);
        setUniversities(enrichedData);
      } catch (err: any) {
        const msg = err.message || "Failed to load universities.";
        console.error("[loadUniversities] Error:", msg);
        setError(msg);
        setUniversities([]);
      } finally {
        setLoading(false);
      }
    }

    loadUniversities();
  }, [searchTerm, cityFilter]);

  // Compute cities + filtered list
  const cities = useMemo(() => {
    return [...new Set(universities.map((u) => (u.city || "Unknown").toLowerCase()))]
      .sort()
      .map((c) => c.charAt(0).toUpperCase() + c.slice(1));
  }, [universities]);

  const filteredUniversities = useMemo(() => {
    return universities.filter((university) => {
      const term = searchTerm.toLowerCase();
      const cityKey = (university.city || "Unknown").toLowerCase();

      const matchesSearch =
        !searchTerm ||
        (university.name?.toLowerCase().includes(term)) ||
        (university.code?.toLowerCase().includes(term)) ||
        cityKey.includes(term);

      const matchesCity = cityFilter === "all" || cityKey === cityFilter.toLowerCase();

      return matchesSearch && matchesCity;
    });
  }, [universities, searchTerm, cityFilter]);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900">
      <Header currentPage="universities" onGetStarted={handleGetStarted} user={user} />
      <main className="flex-1">
        <section className="w-full py-6 sm:py-8 md:py-12 lg:py-16">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">

            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-fit border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-xs sm:text-sm"
              >
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Back to Home
                </Link>
              </Button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4 sm:gap-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text tracking-tight">
                    Available Universities
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base md:text-lg">
                    Browse through our comprehensive list of accredited universities
                  </p>
                </div>
              </div>

              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <Input
                    placeholder="Search universities by name, code, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTermDebounced(e.target.value)}
                    className="pl-10 h-9 sm:h-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                </div>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                    <SelectValue placeholder="Filter by city" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-y-auto">
                    <SelectItem value="all" className="text-xs sm:text-sm">All Cities</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city.toLowerCase()} className="text-xs sm:text-sm capitalize">
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* UNIFIED UI PATTERN */}
            {loading || authLoading ? (
              <CoursesSkeleton />
            ) : error ? (
              <div className="flex justify-center items-center p-8 rounded-md border bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-300">
                <p>{error}</p>
                <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : filteredUniversities.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-md border bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm || cityFilter !== "all"
                    ? "No universities found matching your criteria."
                    : "No universities available."}
                </p>
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
                      <TableHead className="text-xs sm:text-sm">University Code</TableHead>
                      <TableHead className="text-xs sm:text-sm min-w-[150px] sm:min-w-[200px]">University Name</TableHead>
                      <TableHead className="text-xs sm:text-sm">Location</TableHead>
                      <TableHead className="text-center text-xs sm:text-sm">Available Courses</TableHead>
                      <TableHead className="text-center text-xs sm:text-sm">Accreditation</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUniversities.map((university) => (
                      <UniversityRow
                        key={university.code}
                        university={university}
                        onViewCourses={() => router.push(`/university/${university.code}/courses`)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={!!user} />}
      {showFindCourseForm && (
        <FindCourseForm
          onClose={() => setShowFindCourseForm(false)}
          setShowFindCourseForm={setShowFindCourseForm}
        />
      )}
    </div>
  );
}

export default function UniversitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900">
          <Header currentPage="universities" />
          <main className="flex-1">
            <section className="w-full py-6 sm:py-8 md:py-12 lg:py-16">
              <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
                <CoursesSkeleton />
              </div>
            </section>
          </main>
          <Footer />
        </div>
      }
    >
      <UniversitiesPageContent />
    </Suspense>
  );
}