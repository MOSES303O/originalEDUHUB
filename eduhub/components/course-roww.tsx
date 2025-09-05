// frontend/components/course-row.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Course, KMTCCourse } from "@/types";

interface CourseRowProps {
  course: Course | KMTCCourse;
  isSelected?: boolean;
  onSelect?: () => void;
  showUniversity?: boolean;
  universityName?: string;
}

export function CourseRow({ course, isSelected, onSelect, showUniversity, universityName }: CourseRowProps) {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-muted/50">
      <td className="p-4">
        {onSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="border-gray-300 dark:border-gray-600"
          />
        )}
      </td>
      <td className="p-4 text-gray-900 dark:text-gray-100">{course.code}</td>
      <td className="p-4 text-gray-900 dark:text-gray-100">{course.name}</td>
      <td className="p-4 text-center text-gray-600 dark:text-gray-300">{course.qualification || "N/A"}</td>
      <td className="p-4 text-center text-gray-600 dark:text-gray-300">{course.description || "N/A"}</td>
      <td className="p-4 text-center">
        {onSelect && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSelect}
            className="border-gray-300 dark:border-gray-600"
          >
            {isSelected ? "Deselect" : "Select"}
          </Button>
        )}
      </td>
      <td className="p-4 text-center">
        <Button
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => {
            console.log("[CourseRow] Viewing details for course:", course.id);
            // Navigate to course details (e.g., `/kmtc/[campusCode]/courses/[courseId]`)
          }}
        >
          View Details
        </Button>
      </td>
    </tr>
  );
}