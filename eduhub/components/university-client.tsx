// frontend/components/university-client.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/header";
import { UniversityRow } from "@/components/university-row";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { FindCourseForm } from "@/components/find-course-form";
import { AuthenticationModal } from "@/components/authentication-modal";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { useAuth } from "@/lib/auth-context";
import { UniversityWithCourses } from "@/types";
import { debounce } from "lodash";

interface UniversityClientProps {
  initialUniversities: UniversityWithCourses[];
  initialError: string | null;
}

export default function UniversityClient({ initialUniversities, initialError }: UniversityClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [universities] = useState<UniversityWithCourses[]>(initialUniversities);
  const [error] = useState<string | null>(initialError);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const debouncedSetSearchTerm = useMemo(() => debounce(setSearchTerm, 300), []);

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

  if (process.env.NODE_ENV !== "production") {
    console.log("[Render] State:", { authLoading, error, filteredUniversitiesLength: filteredUniversities.length });
  }

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

        {authLoading ? (
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