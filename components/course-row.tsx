// frontend/components/CourseRow.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Check } from "lucide-react";
import { Course } from "@/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { useSelectedCourses } from "@/lib/course-store";
import { AuthenticationModal } from "@/components/authentication-modal";

interface CourseRowProps {
  course: Course;
  showUniversity?: boolean;
}

export function CourseRow({ course, showUniversity = true }: CourseRowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isCourseSelected, toggleCourseSelection } = useSelectedCourses();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const getQualificationColor = (qualification?: string) => {
    if (!qualification) return "border-gray-500 text-gray-600 dark:text-gray-400";
    switch (qualification.toLowerCase()) {
      case "b":
      case "bachelor":
        return "border-blue-500 text-blue-600 dark:text-blue-400";
      case "b-":
        return "border-yellow-500 text-yellow-600 dark:text-yellow-400";
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
    if (qual === "b" || qual === "bachelor") {
      return { text: "Qualified", color: "text-emerald-600 dark:text-emerald-400" };
    }
    if (qual === "b-") {
      return { text: "Not Qualified", color: "text-red-600 dark:text-red-400" };
    }
    return { text: "Review Required", color: "text-yellow-600 dark:text-yellow-400" };
  };

  const status = getQualificationStatus(course.qualification);

  const handleSelect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to select courses.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      await toggleCourseSelection(course);
      toast({
        title: isCourseSelected(course.id) ? "Course Removed" : "Course Selected",
        description: `Course ${course.name} has been ${
          isCourseSelected(course.id) ? "removed from" : "added to"
        } your selected courses.`,
        duration: 3000,
      });
    } catch (err) {
      console.error("Error toggling course selection:", JSON.stringify(err, null, 2));
      toast({
        title: "Error",
        description: "Failed to update course selection. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={false} />}
      <tr
        className="border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-muted/50"
        onClick={toggleExpanded}
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
            {course.minimum_grade ?? "N/A"}
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
            variant={isCourseSelected(course.id) ? "default" : "outline"}
            size="sm"
            onClick={handleSelect}
            className={
              isCourseSelected(course.id)
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            }
          >
            {isCourseSelected(course.id) ? <Check className="h-4 w-4" /> : "Select"}
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
                  variant={isCourseSelected(course.id) ? "default" : "outline"}
                  className={isCourseSelected(course.id) ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                  onClick={handleSelect}
                >
                  {isCourseSelected(course.id) ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Selected
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