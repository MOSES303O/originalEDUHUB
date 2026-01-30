"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, MapPin, GraduationCap, Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Programme } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useSelectedCourses } from "@/lib/course-store";

interface KMTCProgrammeRowProps {
  programme: Programme;
  onAuthRequired: () => void;
  onViewDetails?: () => void;
}

export function KMTCProgrammeRow({ programme, onAuthRequired, onViewDetails }: KMTCProgrammeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, requirePayment } = useAuth();
  const { toggleCourseSelection, selectedCourses } = useSelectedCourses();
  // Check if this programme is already selected (by code)
  const isSelected = selectedCourses.some((c) => c.code === programme.code);

  const toggleExpanded = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === "keydown" && (e as React.KeyboardEvent).key !== "Enter" && (e as React.KeyboardEvent).key !== " ") {
      return;
    }
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      onAuthRequired();
      toast({
        title: "Login Required",
        description: "Please log in to select programmes.",
        variant: "destructive",
      });
      return;
    }

    if (requirePayment) {
      onAuthRequired();
      toast({
        title: "Subscription Required",
        description: "Please complete your subscription to select programmes.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert Programme to Course-like object for store
      const courseLike = {
        id: programme.id,
        code: programme.code,
        name: programme.name,
        university: { name: "Kenya Medical Training College (KMTC)", id: "kmtc" },
        category: "Health Sciences",
        duration_years: programme.duration.includes("year") 
          ? parseInt(programme.duration) 
          : undefined,
        minimum_grade: undefined,
        tuition_fee_per_year: undefined,
        career_prospects: "",
        is_selected: !isSelected,
      } as any;

      toggleCourseSelection(courseLike);

      toast({
        title: isSelected ? "Programme Removed" : "Programme Selected",
        description: `${programme.name} has been ${isSelected ? "removed from" : "added to"} your selections.`,
        duration: 3000,
      });
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("already")) {
        toast({
          title: "Already Selected",
          description: `${programme.name} is already in your list.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update selection. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("[KMTCProgrammeRow] View button clicked for programme:", programme.code);
    console.log("[KMTCProgrammeRow] Navigating to:", `/kmtc/programmes/${programme.code}`);
  
    if (onViewDetails) {
      onViewDetails();
    } else {
      router.push(`/kmtc/programmes/${programme.code}`);
    }
  };

  return (
    <>
      {/* MAIN ROW */}
      <tr
        className="border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={toggleExpanded}
        onKeyDown={toggleExpanded}
        role="button"
        tabIndex={0}
      >
        <td className="p-4">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </td>
        <td className="p-4 text-gray-900 dark:text-gray-100 font-medium">
          {programme.code}
        </td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-400 rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {programme.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-gray-900 dark:text-gray-100 font-medium max-w-[300px] line-clamp-2">
              {programme.name}
            </span>
          </div>
        </td>
        <td className="p-4 text-gray-600 dark:text-gray-300">
          {programme.department_name}
        </td>
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            {programme.offered_at.length === 0 ? "ALL" : `${programme.offered_at.length} KMTC ${programme.offered_at.length !== 1 ? "es" : ""}`} Campus{programme.offered_at.length !== 1 ? "es" : ""}
          </Badge>
        </td>
        <td className="p-4 text-center">
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
            {programme.level}
          </Badge>
        </td>

        {/* SELECT BUTTON */}
        <td className="p-4">
          <Button
            variant={isSelected ? "destructive" : "outline"}
            size="sm"
            onClick={handleSelect}
            className={isSelected ? "bg-red-500 hover:bg-red-600 text-white" : ""}
          >
            {isSelected ? (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Deselect
              </>
            ) : (
              "Select"
            )}
          </Button>
        </td>

        <td className="p-4">
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleViewDetails}
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            View
          </Button>
        </td>
      </tr>

      {/* EXPANDED ROW */}
      {isExpanded && (
        <tr className="bg-muted/50">
          <td colSpan={8} className="p-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Programme Details</h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p><span className="font-medium">Duration:</span> {programme.duration}</p>
                    <p><span className="font-medium">Qualification:</span> {programme.qualification}</p>
                    <p><span className="font-medium">Faculty:</span> {programme.faculty_name}</p>
                    <p><span className="font-medium">Department:</span> {programme.department_name}</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                    Offered at {programme.offered_at.length === 0 ? "ALL" : `${programme.offered_at.length} KMTC ${programme.offered_at.length !== 1 ? "es" : ""}`} Campus{programme.offered_at.length !== 1 ? "es" : ""}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {programme.offered_at.map((offered, index) => (
                    <div 
                      key={`${programme.id}-${offered.campus_code}-${index}`} 
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg border"
                    >
                      <p className="font-medium text-base">{offered.campus_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <MapPin className="h-4 " />
                        {offered.city}
                      </p>
                      {offered.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                          Note: {offered.notes}
                        </p>
                      )}
                    </div>
                  ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button
                  variant={isSelected ? "destructive" : "outline"}
                  onClick={handleSelect}
                  className={isSelected ? "bg-red-500 hover:bg-red-600" : ""}
                >
                  {isSelected ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deselect Programme
                    </>
                  ) : (
                    "Select Programme"
                  )}
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={handleViewDetails}
                >
                  View Full Details
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}