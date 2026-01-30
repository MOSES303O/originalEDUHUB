// components/course-row.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Course, KMTCCourse } from "@/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { useSelectedCourses } from "@/lib/course-store";

interface CourseRowProps {
  course: Course | KMTCCourse;
  showUniversity?: boolean;
  universityName?: string;
  detailPath?: string;
}

export function CourseRow({
  course,
  showUniversity = true,
  universityName = "KMTC",
  detailPath,
}: CourseRowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, requirePayment, validateToken } = useAuth();
  const { toggleCourseSelection, selectedCourses } = useSelectedCourses();
  const [isExpanded, setIsExpanded] = useState(false);

  const isSelected = selectedCourses.some((c) => c.code === course.code);

  // components/course-row.tsx
const handleSelect = async (e: React.MouseEvent) => {
  e.stopPropagation();

  if (!user || requirePayment) {
    validateToken();
    toast({
      title: "Login Required",
      description: "Please log in or complete payment to select courses.",
      variant: "destructive",
      duration: 4000,
    });
    return;
  }

  // BLOCK KMTC COURSES HERE — NEVER LET THEM ENTER THE STORE
  const isKMTCCourse = 
    course.code ||
    universityName === "KMTC" ||
    (course as any).campus !== undefined;

  if (isKMTCCourse) {
    // LOCAL ONLY — NO API, NO STORE CALL
    const localCourses = JSON.parse(localStorage.getItem("kmtc-selected-courses") || "[]");
    const exists = localCourses.some((c: any) => c.code === course.code);

    if (exists) {
      const updated = localCourses.filter((c: any) => c.code !== course.code);
      localStorage.setItem("kmtc-selected-courses", JSON.stringify(updated));
      toast({ title: "Course Removed", description: `${course.name} removed from your list.` });
    } else {
      localCourses.push({
        code: course.code,
        name: course.name,
        university_name: "KMTC",
        qualification: course.qualification || "N/A",
        type:course.level || "N/A", 
        description: course.description,
      });
      localStorage.setItem("kmtc-selected-courses", JSON.stringify(localCourses));
      toast({ title: "Course Selected", description: `${course.name} added to your list.` });
    }
    return; // STOP HERE — NO ZUSTAND, NO API
  }

  // ONLY UNIVERSITY COURSES → USE ZUSTAND + API
  try {
    const normalizedCourse: Course = {
      id: (course as any).id || course.code,
      code: course.code,
      name: course.name,
      university_name: universityName,
      university: { name: universityName } as any,
      minimum_grade: "N/A",
      qualification: course.qualification || "N/A",
      type :course.level || "N/A",
      description: course.description || "",
      is_selected: isSelected,
    };

    await toggleCourseSelection(normalizedCourse);

    toast({
      title: isSelected ? "Course Removed" : "Course Selected",
      description: `${course.name} ${isSelected ? "removed from" : "added to"} your selections.`,
    });
  } catch (err) {
    toast({
      title: "Error",
      description: "Failed to update selection.",
      variant: "destructive",
    });
  }
};

  const toggleExpanded = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === "keydown" && (e as React.KeyboardEvent).key !== "Enter" && (e as React.KeyboardEvent).key !== " ") {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    const path = detailPath
      ? `${detailPath}/${course.id || course.code}`
      : `/courses/${course.id || course.code}`;
    router.push(path);
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

        <td className="p-4 text-gray-900 dark:text-gray-100 font-medium">{course.code}</td>
        <td className="p-4 text-gray-900 dark:text-gray-100">{course.name}</td>

        {showUniversity && (
          <td className="p-4 text-gray-600 dark:text-gray-300">{universityName}</td>
        )}

        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            { "N/A"}
          </Badge>
        </td>
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            {course.level || "N/A"}
          </Badge>
        </td>

        <td className="p-4 text-center">
          <div className="max-w-xs truncate text-sm text-gray-600 dark:text-gray-400">
            {course.description || "No description"}
          </div>
        </td>

        {/* SELECT BUTTON */}
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
      </tr>

      {/* EXPANDED ROW */}
      {isExpanded && (
        <tr className="bg-muted/50">
          <td colSpan={showUniversity ? 8 : 7} className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div><h4 className="text-sm font-semibold">Course Code</h4><p>{course.code}</p></div>
                <div><h4 className="text-sm font-semibold">Course Name</h4><p>{course.name}</p></div>
                {showUniversity && (
                  <div><h4 className="text-sm font-semibold">Campus</h4><p>{universityName}</p></div>
                )}
                <div><h4 className="text-sm font-semibold">Qualification</h4><p>{course.qualification || "N/A"}</p></div>
                <div><h4 className="text-sm font-semibold">Type/Level</h4><p>{course.level || "N/A"}</p></div>
                <div className="col-span-2 md:col-span-3">
                  <h4 className="text-sm font-semibold">Description</h4>
                  <p>{course.description || "No description available"}</p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
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
                  onClick={handleViewDetails}
                >
                  View Course Details
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}