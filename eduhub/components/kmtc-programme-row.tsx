"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, MapPin, GraduationCap, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useSelectedCourses } from "@/lib/course-store";
import { Programme } from "@/types"; // ← Assuming Programme type includes qualified & qualification_details from engine
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { toggleCourseSelection, isCourseSelected } = useSelectedCourses();

  // Live selected state from store (using code as identifier)
  const isSelected = isCourseSelected(String(programme.code));
  const missingMandatory = programme.qualification_details?.missing_mandatory ?? [];

  const handleSelect = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Auth & payment checks
    if (!user) {
      onAuthRequired();
      toast({
        title: "Login Required",
        description: "Please log in to select KMTC programmes.",
        variant: "destructive",
      });
      return;
    }

    if (requirePayment) {
      onAuthRequired();
      toast({
        title: "Subscription Required",
        description: "Complete your subscription to select KMTC programmes.",
        variant: "destructive",
      });
      return;
    }

    // Qualification gate (from KMTC engine)
    if (!programme.qualified && !isSelected) {
      toast({
        title: "Cannot Select",
        description: programme.qualification_details?.reason || 
          "You do not meet the entry requirements for this programme yet.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const willBeSelected = !isSelected;

    try {
      // Convert Programme to a Course-like object for the store
      const courseLike = {
        id: programme.id,
        code: programme.code,
        name: programme.name,
        university: { name: "Kenya Medical Training College (KMTC)" },
        category: "Health Sciences",
        duration_years: programme.duration?.includes("year") 
          ? parseInt(programme.duration) 
          : undefined,
        minimum_grade: undefined,
        tuition_fee_per_year: undefined,
        career_prospects: "",
        is_selected: willBeSelected,
      } as any;

      await toggleCourseSelection(courseLike);

      toast({
        title: willBeSelected ? "Programme Selected" : "Programme Removed",
        description: `${programme.name} has been ${willBeSelected ? "added to" : "removed from"} your selections.`,
        duration: 3000,
      });
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("already") || msg.includes("exists")) {
        toast({
          title: "Already Selected",
          description: `${programme.name} is already in your list.`,
          duration: 3000,
        });
        return;
      }

      toast({
        title: "Error",
        description: msg || "Failed to update selection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails();
    } else {
      router.push(`/kmtc/programmes/${programme.code}`);
    }
  };

  const toggleExpanded = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === "keydown" && (e as React.KeyboardEvent).key !== "Enter" && (e as React.KeyboardEvent).key !== " ") {
      return;
    }
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Qualification badge (from KMTC engine)
  const qualificationDisplay = programme.qualified ? (
    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
      <CheckCircle className="h-4 w-4" />
      <span>Qualified</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
      <XCircle className="h-4 w-4" />
      <span>Not Qualified</span>
    </div>
  );
  // Helper: flatten all campuses from the nested offered_at structure
  function getAllCampuses(offeredAt: any[]): any[] {
    return offeredAt
      .flatMap(entry => entry.campuses || [])
      .filter(c => c && (c.name || c.code)); // remove null/empty entries
  }

  // Helper: count total campuses (optional deduplication by code/name)
  function getTotalCampuses(offeredAt: any[]): number {
    const campuses = getAllCampuses(offeredAt);
    const unique = new Set(campuses.map(c => c.code || c.name || JSON.stringify(c)));
    return unique.size;
  }
  function getCampusCount(offeredAt: any[] | undefined): number {
    if (!offeredAt || offeredAt.length === 0) return 0;

    // Flatten all campuses across all offered_at entries
    const campuses = offeredAt.flatMap(entry => entry.campuses || []);

    // Optional: deduplicate by code or name to avoid double-counting
    const unique = new Set(campuses.map(c => c.code || c.name || JSON.stringify(c)));

    return unique.size;
  }

  return (
    <>
      {/* MAIN ROW */}
      <tr
        className="border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={toggleExpanded}
        onKeyDown={toggleExpanded}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <td className="p-4">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </td>

        <td className="p-4 font-medium text-gray-900 dark:text-gray-100">
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
          {programme.department_name || "—"}
        </td>

        <td className="p-4 text-center">
         <Badge 
           variant="outline" 
           className="border-emerald-500 text-emerald-600 dark:text-emerald-400 px-3 py-1"
         >
           {programme.offered_at?.some(o => o.offered_everywhere) || !programme.offered_at?.length
             ? "ALL CAMPUSES"
             : `${getCampusCount(programme.offered_at)} Campus${getCampusCount(programme.offered_at) !== 1 ? "es" : ""}`}
         </Badge>
        </td>

        <td className="p-4 text-center">
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
            {programme.level?.charAt(0).toUpperCase() + programme.level?.slice(1) || "—"}
          </Badge>
        </td>

        <td className="p-4 text-center">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center cursor-help">{qualificationDisplay}</div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs p-3">
                {programme.qualified ? (
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                    You meet the entry requirements for this programme.
                  </p>
                ) : (
                  <>
                    <p className="font-medium mb-1.5 text-red-600 dark:text-red-400">
                      You do not currently qualify
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {programme.qualification_details?.reason || "Check your subjects and grades."}
                    </p>

                    {missingMandatory.length > 0 && (
                      <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 mt-2">
                        {missingMandatory.map((item, i) => (
                          <li key={i}>
                            {item.subject_or_group} ≥ {item.min_grade}
                          </li>
                        ))}
                      </ul>
                    )}
                                      </>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>

        <td className="p-4">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelected ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleSelect}
                  disabled={!programme.qualified && !isSelected}
                  className={
                    isSelected
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : programme.qualified
                        ? "border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        : "opacity-60 cursor-not-allowed border-gray-300 dark:border-gray-700"
                  }
                >
                  {isSelected ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Deselect
                    </>
                  ) : (
                    "Select"
                  )}
                </Button>
              </TooltipTrigger>
              {!programme.qualified && !isSelected && (
                <TooltipContent>
                  <p className="text-sm">You do not qualify for this programme yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Update your subjects or grades to check eligibility.
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </td>

        <td className="p-4 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleViewDetails}
          >
            View
          </Button>
        </td>
      </tr>

      {/* EXPANDED DETAILS ROW */}
      {isExpanded && (
        <tr className="bg-muted/30">
          <td colSpan={8} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Programme Details</h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Code:</span> {programme.code}</p>
                  <p><span className="font-medium">Level:</span> {programme.level?.charAt(0).toUpperCase() + programme.level?.slice(1)}</p>
                  <p><span className="font-medium">Duration:</span> {programme.duration || "—"}</p>
                  <p><span className="font-medium">Qualification:</span> {programme.qualification || "—"}</p>
                  <p><span className="font-medium">Faculty:</span> {programme.faculty_name || "—"}</p>
                  <p><span className="font-medium">Department:</span> {programme.department_name || "—"}</p>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  Offered at{" "}
                  {programme.offered_at?.some(o => o.offered_everywhere)
                    ? "ALL KMTC CAMPUSES"
                    : programme.offered_at?.length > 0
                    ? `${getTotalCampuses(programme.offered_at)} Campus${getTotalCampuses(programme.offered_at) !== 1 ? "es" : ""}`
                    : "Not specified"}
                </h4>
                  
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {programme.offered_at?.some(o => o.offered_everywhere) ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 col-span-full">
                      <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                        This programme is offered at all KMTC campuses nationwide.
                      </p>
                    </div>
                  ) : programme.offered_at?.length > 0 ? (
                    getAllCampuses(programme.offered_at).map((campus, index) => (
                      <div
                        key={`${campus.code || campus.name}-${index}`}
                        className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                      >
                        <p className="font-medium text-base">{campus.name || "Unknown Campus"}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4" />
                          {campus.city || "—"}
                        </p>
                        {campus.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                            Note: {campus.notes}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic col-span-full">
                      Campus information not available for this programme
                    </p>
                  )}
                </div>
              </div>

              {/* Qualification Details in Expanded View */}
              <div className="col-span-full mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  Qualification Status
                </h4>
                {programme.qualified ? (
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="font-medium">You meet the entry requirements for this programme.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center text-red-600 dark:text-red-400">
                      <XCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">You do not currently qualify</span>
                    </div>
                    {programme.qualification_details?.reason && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        <strong>Reason:</strong> {programme.qualification_details.reason}
                      </p>
                    )}
                    {missingMandatory.length > 0 && (
                      <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 mt-2">
                        {missingMandatory.map((item, i) => (
                          <li key={i}>
                            {item.subject_or_group} ≥ {item.min_grade}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant={isSelected ? "destructive" : "outline"}
                onClick={handleSelect}
                disabled={!programme.qualified && !isSelected}
                className={isSelected ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {isSelected ? (
                  <>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Deselect Programme
                  </>
                ) : (
                  "Select Programme"
                )}
              </Button>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleViewDetails}
              >
                View Full Details
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}