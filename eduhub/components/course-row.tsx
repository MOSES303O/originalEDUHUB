"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { Course } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
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
  const { toggleCourseSelection } = useSelectedCourses();
  const [isExpanded, setIsExpanded] = useState(false);
  const userPoints = Number(searchParams.get("points") || "0");

  const getQualificationColor = (qualification?: string) => {
    if (!qualification) return "border-gray-500 text-gray-600 dark:text-gray-400";
    switch (qualification.toLowerCase()) {
      case "b":
      case "bachelor":
        return "border-blue-500 text-blue-600 dark:text-blue-400";
      case "m":
      case "master":
        return "border-purple-500 text-purple-600 dark:text-purple-400";
      case "phd":
        return "border-red-500 text-red-600 dark:text-red-400";
      default:
        return "border-gray-500 text-gray-600 dark:text-gray-400";
    }
  };

  const getQualificationStatus = (qualification?: string) => {
    if (!qualification) {
      return { text: "Unknown", color: "text-gray-600 dark:text-gray-400" };
    }
    const qual = qualification.toLowerCase();
    const isQualified = userPoints >= Number(course.minimum_grade);
    if (qual.includes("bachelor") && isQualified) {
      return { text: "Qualified", color: "text-emerald-600 dark:text-emerald-400" };
    }
    if (qual.includes("master") || qual.includes("phd")) {
      return { text: "Review Required", color: "text-yellow-600 dark:text-yellow-400" };
    }
    return { text: "Not Qualified", color: "text-red-600 dark:text-red-400" };
  };

  const status = getQualificationStatus(course.qualification);

  const handleSelect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!course.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id)) {
      console.error("[CourseRow] Invalid course ID:", course);
      toast({
        title: "Error",
        description: "Invalid course ID. Please try another course.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    if (!user) {
      console.log("[CourseRow] User not authenticated, triggering onAuthRequired");
      onAuthRequired();
      toast({
        title: "Authentication Required",
        description: "Please log in to select courses.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    if (requirePayment) {
      console.log("[CourseRow] User requires payment, triggering onAuthRequired");
      onAuthRequired();
      toast({
        title: "Subscription Required",
        description: "Please complete your subscription to select courses.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    try {
      console.log("[CourseRow] Toggling course:", course.id, course.name);
      const wasSelected = course.is_selected || false;
      await toggleCourseSelection(course);
      toast({
        title: wasSelected ? "Course Removed" : "Course Selected",
        description: `Course ${course.name} has been ${wasSelected ? "removed from" : "added to"} your selected courses.`,
        duration: 3000,
      });
    } catch (err: any) {
      console.error("[CourseRow] Failed to toggle course:", JSON.stringify(err, null, 2));
      toast({
        title: "Error",
        description: "Failed to update course selection. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const toggleExpanded = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === "keydown" && (e as React.KeyboardEvent).key !== "Enter" && (e as React.KeyboardEvent).key !== " ") {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <tr
        className="border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-muted/50"
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
          <td className="p-4 text-gray-600 dark:text-gray-300">{course.university_name ?? "N/A"}</td>
        )}
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            {Number(course.minimum_grade).toFixed(3) ?? "N/A"}
          </Badge>
        </td>
        <td className="p-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Badge variant="outline" className={getQualificationColor(course.qualification)}>
              {course.qualification ?? "N/A"}
            </Badge>
            <span className={`text-xs ${status.color}`}>● {status.text}</span>
          </div>
        </td>
        <td className="p-4">
          <Button
            variant={course.is_selected ? "destructive" : "outline"}
            size="sm"
            onClick={handleSelect}
            className={
              course.is_selected
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            }
          >
            {course.is_selected ? (
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
      {isExpanded && (
        <tr className="bg-muted/50">
          <td colSpan={showUniversity ? 8 : 7} className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <h4 className="text-sm font-semibold">Course Code</h4>
                  <p>{course.code}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Course Name</h4>
                  <p>{course.name}</p>
                </div>
                {showUniversity && (
                  <div>
                    <h4 className="text-sm font-semibold">University</h4>
                    <p>{course.university_name ?? "N/A"}</p>
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
                  <p>{course.tuition_fee_per_year ? `KES ${course.tuition_fee_per_year}` : "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Application Fee</h4>
                  <p>{course.application_fee ? `KES ${course.application_fee}` : "N/A"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Average Rating</h4>
                  <p>
                    {course.average_rating !== undefined && course.total_reviews !== undefined
                      ? `${course.average_rating} (${course.total_reviews} reviews)`
                      : "No reviews"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Qualification Status</h4>
                  {status.text === "Qualified" ? (
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
                <div className="col-span-2 md:col-span-3">
                  <h4 className="text-sm font-semibold">Description</h4>
                  <p>{course.description || "No description available"}</p>
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <Button
                  variant={course.is_selected ? "destructive" : "outline"}
                  className={course.is_selected ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                  onClick={handleSelect}
                >
                  {course.is_selected ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deselect
                    </>
                  ) : (
                    "Add to Selected"
                  )}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => router.push(`/courses/${course.id}`)}
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