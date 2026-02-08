"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useSelectedCourses } from "@/lib/course-store";
import { Course } from "@/types";  // ← Keep using Course (now enriched with qualification)
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CourseRowProps {
  course: Course;
  showUniversity?: boolean;
  onAuthRequired: () => void;
}

export function CourseRow({ course, showUniversity = true, onAuthRequired }: CourseRowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, requirePayment } = useAuth();
  const { toggleCourseSelection, isCourseSelected } = useSelectedCourses();

  const [isExpanded, setIsExpanded] = useState(false);

  // LIVE from store — always current
  const isSelected = isCourseSelected(String(course.code));

  const handleSelect = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      onAuthRequired();
      toast({
        title: "Login Required",
        description: "Please log in to select courses.",
        variant: "destructive",
      });
      return;
    }

    if (requirePayment) {
      onAuthRequired();
      toast({
        title: "Subscription Required",
        description: "Complete your subscription to select courses.",
        variant: "destructive",
      });
      return;
    }

    // Optional: Block selection if not qualified
    if (!course.qualified) {
      toast({
        title: "Cannot Select",
        description: "You do not qualify for this course yet.",
        variant: "destructive",
      });
      return;
    }

    const willBeSelected = !isSelected;

    try {
      await toggleCourseSelection(course);
      toast({
        title: willBeSelected ? "Course Selected" : "Course Removed",
        description: `${course.name} has been ${willBeSelected ? "added to" : "removed from"} your selections.`,
        duration: 3000,
      });
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("already") || msg.includes("exists")) {
        toast({
          title: "Already Selected",
          description: `${course.name} is already in your list.`,
          duration: 3000,
        });
        return;
      }
      toast({
        title: "Update Failed",
        description: msg || "Could not update selection.",
        variant: "destructive",
      });
    }
  };

  const toggleExpanded = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === "keydown" && (e as React.KeyboardEvent).key !== "Enter" && (e as React.KeyboardEvent).key !== " ") {
      return;
    }
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Qualification display (from backend engine)
  const qualificationDisplay = course.qualified ? (
    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
      <CheckCircle className="h-4 w-4" />
      <span>Qualified</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
      <XCircle className="h-4 w-4" />
      <span>Not Qualified</span>
    </div>
  );

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
          {course.code && course.code !== "N/A" ? course.code : "CODE NOT AVAILABLE"}
        </td>
        <td className="p-4 text-gray-900 dark:text-gray-100">{course.name}</td>
        {showUniversity && (
          <td className="p-4 text-gray-600 dark:text-gray-300">
            {course.university?.name || course.university_name || "N/A"}
          </td>
        )}
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            {course.cluster_requirements || "N/A"}
          </Badge>
        </td>
        <td className="p-4 text-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">{qualificationDisplay}</div>
              </TooltipTrigger>
              {!course.qualified && course.qualification_details && (
                <TooltipContent side="right" className="max-w-xs p-3 bg-slate-400/90 text-white rounded-md">
                  <p className="font-medium mb-2">Why not qualified?</p>
                  <p className="text-sm text-muted-foreground">
                    {course.qualification_details.reason || "Check your subjects and points."}
                  </p>

                  {course.qualification_details?.points_source && (
                    <p className="text-xs mt-3 text-muted-foreground">
                      Points source: {course.qualification_details.points_source} ({course.user_points?.toFixed(3)})
                    </p>
                  )}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </td>

        {/* SELECT BUTTON — Dictated by qualification */}
        <td className="p-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelected ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleSelect}
                  disabled={!course.qualified && !isSelected}
                  className={
                    isSelected
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : course.qualified
                        ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 opacity-70 cursor-not-allowed"
                  }
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
              </TooltipTrigger>
              {!course.qualified && !isSelected && (
                <TooltipContent>
                  <p>You do not qualify for this course yet.</p>
                  <p className="text-xs mt-1">Update your subjects or cluster points to check eligibility.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </td>

        <td className="p-4">
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/courses/${course.id}`);
            }}
          >
            View
          </Button>
        </td>
      </tr>

      {/* EXPANDED DETAILS ROW */}
      {isExpanded && (
        <tr className="bg-muted/50">
          <td colSpan={showUniversity ? 8 : 7} className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <h4 className="text-sm font-semibold">Program Code</h4>
                  <p>{course.code && course.code !== "N/A" ? course.code : "CODE NOT AVAILABLE"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Program Name</h4>
                  <p>{course.name}</p>
                </div>
                {showUniversity && (
                  <div>
                    <h4 className="text-sm font-semibold">University</h4>
                    <p>{course.university?.name || course.university_name || "N/A"}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold">Category</h4>
                  <p>{course.category ? course.category.charAt(0).toUpperCase() + course.category.slice(1) : "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Duration</h4>
                  <p>{course.duration_years ? `${course.duration_years} years` : "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Tuition Fee (Per Year)</h4>
                  <p>{course.tuition_fee_per_year ? `KES ${Number(course.tuition_fee_per_year).toLocaleString()}` : "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Qualification Status</h4>
                  {course.qualified ? (
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
                      <span className="text-green-500">You meet the requirements</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-500 mr-1" />
                      <span className="text-red-500">You do not meet the requirements</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 flex gap-3">
                <Button
                  variant={isSelected ? "destructive" : "outline"}
                  onClick={handleSelect}
                  disabled={!course.qualified && !isSelected}
                  className={isSelected ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                >
                  {isSelected ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deselect
                    </>
                  ) : (
                    "Add to Selected"
                  )}
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => router.push(`/courses/${course.id}`)}
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