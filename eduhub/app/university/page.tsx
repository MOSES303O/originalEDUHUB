"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { UniversityRow } from "@/components/university-row";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Heart } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { FindCourseForm } from "@/components/find-course-form";
import {
  fetchUniversities,
  fetchUniversityDetails,
  fetchCourseCount,
  fetchSelectedUniversities,
  insertSelectedUniversity,
  removeSelectedUniversity,
} from "@/lib/api";
import { University } from "@/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { AuthenticationModal } from "@/components/authentication-modal";
import { useAuth } from "@/lib/auth-context";
import { debounce } from "lodash";

export default function UniversityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [selectedUniversities, setSelectedUniversities] = useState<Set<string>>(new Set());
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const debouncedSetSearchTerm = useMemo(() => debounce(setSearchTerm, 300), []);

  // Handle Get Started button click
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
            .filter((uni: University) => {
              if (!uni.id || !uni.code || typeof uni.code !== "string") {
                console.warn("[loadUniversities] Skipping invalid university:", uni);
                return false;
              }
              return true;
            })
            .map(async (uni: University) => {
              try {
                const courseCount = await fetchCourseCount(uni.code!);
                console.log(`[loadUniversities] Course count for ${uni.code}:`, courseCount);
                return {
                  ...uni,
                  available_courses: courseCount,
                  accreditation: uni.accreditation ?? "N/A",
                  established_year: uni.established_year ?? "Unknown",
                  faculties: uni.faculties ?? [],
                };
              } catch (err) {
                console.error(`[loadUniversities] Error enriching ${uni.code}:`, JSON.stringify(err, null, 2));
                return {
                  ...uni,
                  available_courses: 0,
                  accreditation: uni.accreditation ?? "N/A",
                  established_year: "Unknown",
                  faculties: [],
                  departments: [],
                };
              }
            })
        );

        console.log("[loadUniversities] Enriched universities:", enrichedData);
        setUniversities([...enrichedData]);
      } catch (err: any) {
        const errorDetails = {
          message: err.message || "Unknown error",
          status: err.response?.status,
          data: err.response?.data,
        };
        console.error("[loadUniversities] Error loading universities:", JSON.stringify(errorDetails, null, 2));
        setError("Failed to load universities. Please try again later.");
        setUniversities([]);
      } finally {
        setLoading(false);
        console.log("[loadUniversities] Final state:", { loading, universities });
      }
    }

    async function loadSelectedUniversities() {
      if (!user) return;
      try {
        const selected = await fetchSelectedUniversities();
        console.log("[loadSelectedUniversities] Selected universities:", selected);
        // Filter out undefined codes to ensure Set<string>
        const validCodes = selected
          .map((uni) => uni.code)
          .filter((code): code is string => typeof code === "string");
        setSelectedUniversities(new Set(validCodes));
      } catch (err) {
        console.error("[loadSelectedUniversities] Failed to fetch selected universities:", JSON.stringify(err, null, 2));
      }
    }

    loadUniversities();
    loadSelectedUniversities();
  }, [searchTerm, cityFilter, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      const timer = setTimeout(() => {
        console.log("[AuthModal] Showing AuthenticationModal after 2-minute delay");
        setShowAuthModal(true);
      }, 120000);
      return () => clearTimeout(timer);
    } else {
      setShowAuthModal(false);
    }
  }, [authLoading, user]);

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(universities.map((uni) => (uni.city || "Unknown").toLowerCase()))].sort();
    console.log("[Cities] Unique cities:", uniqueCities);
    return uniqueCities;
  }, [universities]);

  const filteredUniversities = useMemo(() => {
    const filtered = universities.filter((university) => {
      const matchesSearch =
        searchTerm === "" ||
        university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (university.code && university.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        ((university.city || "Unknown").toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCity =
        cityFilter === "all" || (university.city || "Unknown").toLowerCase() === cityFilter.toLowerCase();
      console.log(
        `[Filter] ${university.name}: search=${matchesSearch}, city=${matchesCity}, cityFilter=${cityFilter}, uniCity=${university.city || "Unknown"}`
      );
      return matchesSearch && matchesCity;
    });
    console.log("[Filter] Filtered universities:", filtered);
    return filtered;
  }, [universities, searchTerm, cityFilter]);

  const toggleUniversitySelection = async (universityCode: string) => {
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to select universities.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const newSelected = new Set(selectedUniversities);
    if (newSelected.has(universityCode)) {
      try {
        await removeSelectedUniversity(universityCode);
        newSelected.delete(universityCode);
        toast({
          title: "University Removed",
          description: `University ${universityCode} removed from selection.`,
          duration: 3000,
        });
      } catch (err) {
        console.error("[toggleUniversitySelection] Failed to remove university:", JSON.stringify(err, null, 2));
        toast({
          title: "Error",
          description: "Failed to remove university. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } else {
      try {
        await insertSelectedUniversity(universityCode);
        newSelected.add(universityCode);
        toast({
          title: "University Selected",
          description: `University ${universityCode} added to selection.`,
          duration: 3000,
        });
      } catch (err) {
        console.error("[toggleUniversitySelection] Failed to select university:", JSON.stringify(err, null, 2));
        toast({
          title: "Error",
          description: "Failed to select university. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
    setSelectedUniversities(newSelected);
  };

  console.log("[Render] State:", { loading, authLoading, error, filteredUniversitiesLength: filteredUniversities.length });

  return (
    <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
      <Header currentPage="universities" onGetStarted={handleGetStarted} user={user} />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={!!user} />}
      {showFindCourseForm && (
        <FindCourseForm
          onClose={() => setShowFindCourseForm(false)}
          setShowFindCourseForm={setShowFindCourseForm}
        />
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                toast({
                  title: "Authentication Required",
                  description: "Please log in to view selected universities.",
                  variant: "destructive",
                  duration: 3000,
                });
              } else {
                router.push("/selected-universities");
              }
            }}
          >
            <Heart className="w-4 h-4 mr-2" />
            Selected Universities ({selectedUniversities.size})
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Available Universities</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse through our comprehensive list of accredited universities
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search universities by name, code, or location..."
              value={searchTerm}
              onChange={(e) => debouncedSetSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
                Clear
              </Button>
            )}
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city.charAt(0).toUpperCase() + city.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading || authLoading ? (
          <CoursesSkeleton />
        ) : error ? (
          <div className="flex justify-center items-center p-8 rounded-md border bg-red-50 dark:bg-red-900/20 dark:text-red-300">
            <p>{error}</p>
            <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : filteredUniversities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {searchTerm || cityFilter !== "all" ? "No universities found matching your criteria." : "No universities available."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>University Code</TableHead>
                  <TableHead>University Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Available Courses</TableHead>
                  <TableHead className="text-center">Accreditation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
      <Footer />
    </div>
  );
}

