"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Search, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSelectedCourses } from "@/lib/course-store";
import { useToast } from "@/hooks/use-toast";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { KMTCProgrammeRow } from "@/components/kmtc-programme-row";
import { Programme } from "@/types";
import { fetchKMTCProgrammes } from "@/lib/api";
import apiClient from "@/lib/api";
import { UserInfoPanel } from "@/components/panel";

export default function KMTCProgrammesPageContent() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClusterPoints, setEditingClusterPoints] = useState(false);
  const [tempClusterPoints, setTempClusterPoints] = useState("00.000");

  const router = useRouter();
  const { toast } = useToast();
  const { 
    user, 
    loading: authLoading, 
    requirePayment, 
    setUser, 
    validateToken 
  } = useAuth();
  const { selectedCourses, refreshFromBackend } = useSelectedCourses();

  // User points from query string (client-side only)
  const userPoints = typeof window !== "undefined"
    ? Number.parseInt(new URLSearchParams(window.location.search).get("points") || "0", 10)
    : 0;

  // ────────────────────────────────────────────────
  // Load KMTC programmes + refresh selected courses
  // ────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        if (user && !requirePayment) {
          await refreshFromBackend();
        }

        const fetchedProgrammes = await fetchKMTCProgrammes();

        if (fetchedProgrammes && Array.isArray(fetchedProgrammes) && fetchedProgrammes.length > 0) {
          setProgrammes(fetchedProgrammes);
        } else {
          throw new Error("No KMTC programmes received from server");
        }
      } catch (err: any) {
        const errorMessage =
          err.message && typeof err.message === "string"
            ? err.message
            : "Failed to load KMTC programmes. Please try again later.";
        setError(errorMessage);
        console.error("[KMTCProgrammesPage] Load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, requirePayment, refreshFromBackend]);

  // Auto-show auth modal
  useEffect(() => {
    if (!authLoading && (!user || requirePayment)) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [authLoading, user, requirePayment]);

  const handleGetStarted = () => {
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else if (requirePayment) {
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

  const handleAuthRequired = () => {
    setShowAuthModal(true);
  };

  const filteredProgrammes = useMemo(() => {
    return programmes.filter((prog) => {
      const term = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        prog.name.toLowerCase().includes(term) ||
        prog.code.toLowerCase().includes(term) ||
        prog.department_name.toLowerCase().includes(term) ||
        prog.faculty_name.toLowerCase().includes(term)
      );
    });
  }, [programmes, searchTerm]);

  const saveClusterPoints = async () => {
    const newValue = parseFloat(tempClusterPoints);

    if (isNaN(newValue) || newValue < 0 || newValue > 84) {
      toast({
        title: "Invalid Value",
        description: "Cluster points must be between 0.000 and 84.000",
        variant: "destructive",
      });
      setTempClusterPoints("00.000");
      setEditingClusterPoints(false);
      return;
    }

    const payload = { cluster_points: newValue.toFixed(3) };
    console.log("Sending PATCH:", payload);

    try {
      await apiClient.patch("/eduhub/auth/profile/update/", payload);

      setUser((prev: any) => ({
        ...prev,
        cluster_points: newValue.toFixed(3),
      }));

      await validateToken();

      toast({
        title: "Saved",
        description: `Cluster points set to ${newValue.toFixed(3)}`,
      });
      setEditingClusterPoints(false);
    } catch (err: any) {
      console.error("PATCH error:", err.response?.data || err.message);
      toast({
        title: "Failed",
        description: "Could not save cluster points",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header currentPage="kmtc-courses" onGetStarted={handleGetStarted} user={user} />

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            {/* TOP BAR */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-6 mb-8">
              {/* Left: Back + Title */}
              <div className="flex flex-col items-start gap-4 mb-8">
                <Button variant="outline" size="sm" asChild className="mb-2">
                  <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>

                <div>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl gradient-text">
                    KMTC Programmes
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 md:text-xl mt-2">
                    Browse all available KMTC programmes and select your preferred ones
                  </p>
                </div>
              </div>

              {/* Right: User Panel + Selected Button */}
              <div className="flex flex-col gap-4 md:items-end">
                {user && <UserInfoPanel className="w-full md:w-auto" />}

                <Button
                  variant="outline"
                  className="flex items-center gap-2 w-full md:w-auto"
                  onClick={() => {
                    if (!user || requirePayment) {
                      setShowAuthModal(true);
                      toast({
                        title: "Authentication Required",
                        description: "Please log in to view your selected courses.",
                        variant: "destructive",
                        duration: 3000,
                      });
                    } else {
                      router.push("/selected-courses");
                    }
                  }}
                >
                  <Heart className="h-4 w-4" />
                  {user ? `Selected Courses (${selectedCourses.length})` : "My Selected Courses"}
                </Button>
              </div>
            </div>

            {/* SEARCH BAR */}
            <div className="flex-1 relative w-full mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by programme name, code, department or faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 sm:h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              />
            </div>

            {/* POINTS BADGE */}
            {userPoints > 0 && (
              <Badge variant="outline" className="text-xs sm:text-sm py-1 px-3 border-emerald-500 text-emerald-600 mb-6">
                Your Total Points: {userPoints}
              </Badge>
            )}

            {/* MAIN CONTENT */}
            {error ? (
              <div className="flex flex-col items-center justify-center p-12 rounded-md border bg-red-50 text-red-500 dark:bg-red-900/20">
                <p>{error}</p>
                <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : filteredProgrammes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-md border bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No programmes found matching your search.
                </p>
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Programme Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Campuses</TableHead>
                      <TableHead className="text-center">Level</TableHead>
                      <TableHead className="text-center">Select</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProgrammes.map((prog) => (
                      <KMTCProgrammeRow
                        key={prog.id}
                        programme={prog}
                        onAuthRequired={handleAuthRequired}
                        onViewDetails={() => router.push(`/kmtc/${prog.code}`)}
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

      {showAuthModal && (
        <AuthenticationModal
          onClose={() => setShowAuthModal(false)}
          canClose={!!(user && !requirePayment)}
        />
      )}
      {showFindCourseForm && (
        <FindCourseForm
          onClose={() => setShowFindCourseForm(false)}
          setShowFindCourseForm={setShowFindCourseForm}
        />
      )}
    </div>
  );
}