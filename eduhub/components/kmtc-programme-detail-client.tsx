"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Building, GraduationCap, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useSelectedCourses } from "@/lib/course-store";
import type { Programme } from "@/types";
interface KMTCProgrammeDetailClientProps {
  initialProgramme: Programme | null;
  initialError: string | null;
  programmeCode: string;
}

export default function KMTCProgrammeDetailClient({
  initialProgramme,
  initialError,
  programmeCode,
}: KMTCProgrammeDetailClientProps) {
  const [programme, setProgramme] = useState<Programme | null>(initialProgramme);
  const [loading, setLoading] = useState(!initialProgramme && !initialError);
  const [error, setError] = useState<string | null>(initialError);
  const router = useRouter();
  const { toast } = useToast();
  const { user, requirePayment } = useAuth();
  const { toggleCourseSelection, selectedCourses } = useSelectedCourses();

  const isSelected = selectedCourses.some((c) => c.code === programme?.code);

  useEffect(() => {
    if (initialProgramme || initialError) return;

    async function loadProgramme() {
      try {
        setLoading(true);
        // In case SSR didn't load it (fallback)
        const res = await fetch(`/kmtc/programmes/${programmeCode}/`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        const prog = data.data || data;
        setProgramme(prog);
      } catch (err) {
        setError("Programme not found or failed to load.");
        console.error("[KMTCProgrammeDetailClient] Load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProgramme();
  }, [initialProgramme, initialError, programmeCode]);

  const handleSelect = () => {
    if (!user || requirePayment || !programme) {
      toast({
        title: "Action Required",
        description: "Please log in and complete subscription to select programmes.",
        variant: "destructive",
      });
      return;
    }

    const courseLike = {
      id: programme.id,
      code: programme.code,
      name: programme.name,
      university: { name: "Kenya Medical Training College (KMTC)" },
      category: "Health Sciences",
    } as any;

    toggleCourseSelection(courseLike);

    toast({
      title: isSelected ? "Programme Deselected" : "Programme Selected",
      description: `${programme.name} has been ${isSelected ? "removed from" : "added to"} your selections.`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-96 mb-8" />
          <Skeleton className="h-64 mb-12" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !programme) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center p-12 bg-red-50 dark:bg-red-900/30 rounded-xl max-w-2xl">
            <h2 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-6">
              Programme Not Found
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg">
              The programme code "{programmeCode}" does not exist or has been removed.
            </p>
            <Button asChild size="lg">
              <Link href="/kmtc">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to All Programmes
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  // Helper: count total unique campuses across all offered_at entries
  function getTotalCampuses(offeredAt: any[]): number {
    const allCampuses = getAllCampuses(offeredAt);
    // Optional: deduplicate by code or name
    const unique = new Set(allCampuses.map(c => c.code || c.name));
    return unique.size;
  }

  // Helper: flatten all campuses from nested structure
  function getAllCampuses(offeredAt: any[]): any[] {
    return offeredAt
      .flatMap(entry => entry.campuses || [])
      .filter(Boolean); // remove null/undefined
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Button variant="outline" size="sm" asChild>
            <Link href="/kmtc">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Programmes
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-12 mb-20">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h1 className="text-5xl font-bold mb-6 leading-tight">{programme.name}</h1>
              <div className="flex flex-wrap gap-4 mb-8">
                <Badge variant="secondary" className="text-lg px-6 py-3">
                  <h1>Course Code:</h1>{programme.code}
                </Badge>
                <Badge className="text-lg px-6 py-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                  {programme.level}
                </Badge>
              </div>

              {/* Select Button */}
              <Button
                size="lg"
                variant={isSelected ? "destructive" : "default"}
                onClick={handleSelect}
                className={isSelected ? "bg-red-500 hover:bg-red-600 text-white" : "bg-slate-500"}
              >
                {isSelected ? (
                  <>
                    <Trash2 className="mr-2 h-5 w-5" />
                    Deselect Programme
                  </>
                ) : (
                  "Select Programme"
                )}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Programme Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                  {programme.description || "No description available for this programme."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Building className="h-7 w-7 text-emerald-600" />
                Offered at{" "}
                {programme.offered_at?.some(o => o.offered_everywhere)
                  ? "ALL KMTC Campuses"
                  : programme.offered_at?.length > 0
                  ? `${getTotalCampuses(programme.offered_at)} KMTC Campus${getTotalCampuses(programme.offered_at) !== 1 ? "es" : ""}`
                  : "Not specified"}
              </CardTitle>
            </CardHeader>
                
            <CardContent>
              {programme.offered_at?.some(o => o.offered_everywhere) ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <p className="font-medium text-lg text-emerald-700 dark:text-emerald-300">
                    Offered at all KMTC campuses across Kenya.
                  </p>
                </div>
              ) : programme.offered_at?.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getAllCampuses(programme.offered_at).map((campus, index) => (
                    <div
                      key={`${campus.code}-${index}`}
                      className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border hover:shadow-md transition-all hover:border-emerald-500"
                    >
                      <p className="font-bold text-xl mb-2">{campus.name}</p>
                      <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-emerald-600" />
                        {campus.city}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
                  <p className="text-amber-700 dark:text-amber-300 font-medium">
                    Campus information not available for this programme.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Right Column - Sidebar Info */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Programme Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-7">
                <div className="flex items-center gap-4">
                  <GraduationCap className="h-10 w-10 text-emerald-600" />
                  <div>
                    <p className="text-sm text-gray-500">Qualification</p>
                    <p className="text-2xl font-bold">{programme.qualification}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Clock className="h-10 w-10 text-emerald-600" />
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="text-2xl font-bold">{programme.duration}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Faculty</p>
                  <p className="text-2xl font-bold">{programme.faculty_name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Department</p>
                  <p className="text-2xl font-bold">{programme.department_name}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}