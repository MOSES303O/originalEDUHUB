"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { Course } from "@/types";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useSelectedCourses } from "@/lib/course-store";

interface CourseRowProps {
  course: Course;
  showUniversity?: boolean;
  onAuthRequired: () => void;
}

export function CourseRow({ course, showUniversity = true, onAuthRequired }: CourseRowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, requirePayment } = useAuth();
  const { toggleCourseSelection, isCourseSelected } = useSelectedCourses();

  const [isExpanded, setIsExpanded] = useState(false);

  const userPoints = Number(searchParams.get("points") || "0");

  // LIVE from store — always current
  const isSelected = isCourseSelected(String(course.code));

  const getQualificationColor = (qualification?: string) => {
    if (!qualification) return "border-gray-500 text-gray-600 dark:text-gray-400";
    const lower = qualification.toLowerCase();
    if (lower.includes("bachelor")) return "border-blue-500 text-blue-600 dark:text-blue-400";
    if (lower.includes("master")) return "border-purple-500 text-purple-600 dark:text-purple-400";
    if (lower.includes("phd") || lower.includes("doctor")) return "border-red-500 text-red-600 dark:text-red-400";
    return "border-gray-500 text-gray-600 dark:text-gray-400";
  };

  const getQualificationStatus = () => {
    const minPoints = Number(course.minimum_grade) || 0;
    const isQualified = userPoints >= minPoints;

    if (isQualified) {
      return { text: "Qualified", color: "text-emerald-600 dark:text-emerald-400" };
    }
    return { text: "Not Qualified", color: "text-red-600 dark:text-red-400" };
  };

  const status = getQualificationStatus();

  const handleSelect = async (e: React.MouseEvent) => {
    e.stopPropagation();
  
    if (!user) {
      onAuthRequired();
      toast({ title: "Login Required", description: "...", variant: "destructive" });
      return;
    }
  
    if (requirePayment) {
      onAuthRequired();
      toast({ title: "Subscription Required", description: "...", variant: "destructive" });
      return;
    }
  
    const willBeSelected = !isSelected;
  
    try {
      // Optimistic + backend sync happens inside the store
      await toggleCourseSelection(course);
  
      toast({
        title: willBeSelected ? "Course Selected" : "Course Removed",
        description: `${course.name} has been ${willBeSelected ? "added to" : "removed from"} your selections.`,
        duration: 3000,
      });
    } catch (err: any) {
      const msg = err.message || "";
       if (msg.includes("already-exists") || msg.toLowerCase().includes("already selected")) {
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
          <td className="p-4 text-gray-600 dark:text-gray-300">{course.university?.name || "N/A"}</td>
        )}
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            {course.minimum_grade ? Number(course.minimum_grade).toFixed(3) : "N/A"}
          </Badge>
        </td>
        <td className="p-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className={getQualificationColor(course.category)}>
              {course.duration_years ? `${course.duration_years} years` : "N/A"}
            </Badge>
            <span className={`text-xs ${status.color}`}>● {status.text}</span>
          </div>
        </td>

        {/* SELECT BUTTON — INSTANT TOGGLE */}
        <td className="p-4">
          <Button
            variant={isSelected ? "destructive" : "outline"}
            size="sm"
            onClick={handleSelect}
            className={
              isSelected
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
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
                <div><h4 className="text-sm font-semibold">Program Code</h4><p>{course.code && course.code !== "N/A" ? course.code : "CODE NOT AVAILABLE"}</p></div>
                <div><h4 className="text-sm font-semibold">Program Name</h4><p>{course.name}</p></div>
                {showUniversity && (
                  <div><h4 className="text-sm font-semibold">University</h4><p>{course.university?.name || "N/A"}</p></div>
                )}
                <div><h4 className="text-sm font-semibold">Category</h4><p>{course.category ? course.category.charAt(0).toUpperCase() + course.category.slice(1) : "N/A"}</p></div>
                <div><h4 className="text-sm font-semibold">Duration</h4><p>{course.duration_years ? `${course.duration_years} years` : "N/A"}</p></div>
                <div><h4 className="text-sm font-semibold">Tuition Fee (Per Year)</h4><p>{course.tuition_fee_per_year ? `KES ${Number(course.tuition_fee_per_year).toLocaleString()}` : "N/A"}</p></div>        
                <div><h4 className="text-sm font-semibold">Qualification Status</h4>
                  {status.text === "Qualified" ? (
                    <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-500 mr-1" /><span className="text-green-500">You meet the requirements</span></div>
                  ) : (
                    <div className="flex items-center"><XCircle className="h-5 w-5 text-red-500 mr-1" /><span className="text-red-500">You do not meet the requirements</span></div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 flex gap-3">
                <Button
                  variant={isSelected ? "destructive" : "outline"}
                  onClick={handleSelect}
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