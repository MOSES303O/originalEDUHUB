// frontend/components/kmtc-row.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, MapPin, BookOpen, Phone, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KMTCCampus, KMTCCourse } from "@/types";
import { fetchCoursesByKMTCCampus } from "@/lib/api";

interface KMTCRowProps {
  campus: KMTCCampus;
  onViewCourses?: () => void;
}

export function KMTCRow({ campus, onViewCourses }: KMTCRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [courses, setCourses] = useState<KMTCCourse[]>([]);
  const [courseCount, setCourseCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch courses and count when component mounts or campus changes
  useEffect(() => {
    const loadCourseCount = async () => {
      setIsLoading(true);
      try {
        const fetchedCourses = await fetchCoursesByKMTCCampus(campus.code);
        setCourses(fetchedCourses);
        setCourseCount(fetchedCourses.length);
      } catch (err) {
        setError("Failed to load courses. Please try again.");
        console.error("[KMTCRow] Error fetching courses for campus", campus.code, ":", err);
        setCourseCount(0);
      } finally {
        setIsLoading(false);
      }
    };
    loadCourseCount();
  }, [campus.code]);

  const toggleExpanded = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === "keydown" && (e as React.KeyboardEvent).key !== "Enter" && (e as React.KeyboardEvent).key !== " ") {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleViewCourses = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click from toggling expansion
    console.log("[KMTCRow] Navigating to courses for campus:", campus.code);
    if (onViewCourses) {
      onViewCourses();
    } else {
      router.push(`/kmtc/${campus.code}/courses`);
    }
  };

  return (
    <>
      {/* Main Row */}
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
        <td className="p-4 text-gray-900 dark:text-gray-100 font-medium">{campus.code}</td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-400 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">{campus.name.charAt(0)}</span>
            </div>
            <span className="text-gray-900 dark:text-gray-100 font-medium">{campus.name}</span>
          </div>
        </td>
        <td className="p-4 text-gray-600 dark:text-gray-300 capitalize">{campus.city}</td>
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            {isLoading ? "Loading..." : `${courseCount} Courses`}
          </Badge>
        </td>
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            KMTC Campus
          </Badge>
        </td>
        <td className="p-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleViewCourses}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              View Courses
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded Content */}
      {isExpanded && (
        <tr className="bg-muted/50">
          <td colSpan={7} className="p-0">
            <div className="bg-gray-50 dark:bg-gray-800/30 p-6 border-l-4 border-emerald-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campus Information */}
                <div>
                  <h4 className="text-gray-900 dark:text-gray-100 font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    Campus Information
                  </h4>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="capitalize">{campus.city}</span>
                    </div>
                    <div>{campus.description || "No description available"}</div>
                    <div className="flex items-center gap-2">
                      <span>Campus Code:</span>
                      <span className="font-medium">{campus.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Slug:</span>
                      <span className="font-medium">{campus.slug}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>Contact: Not available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campus.city + " KMTC")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 hover:underline"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  </div>
                </div>

                {/* Courses Offered */}
                <div>
                  <h4 className="text-gray-900 dark:text-gray-100 font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    Courses Offered ({courseCount})
                  </h4>
                  {isLoading ? (
                    <div className="text-gray-600 dark:text-gray-300">Loading courses...</div>
                  ) : error ? (
                    <div className="text-red-500 dark:text-red-400">{error}</div>
                  ) : courses.length === 0 ? (
                    <div className="text-gray-600 dark:text-gray-300">No courses available for this campus.</div>
                  ) : (
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                      {courses.map((course) => (
                        <li key={course.id} className="flex flex-col">
                          <span className="font-medium">{course.name} ({course.code})</span>
                          <span className="text-xs">Department: {course.department}</span>
                          <span className="text-xs">Required Grade: {course.required_grade}</span>
                          <span className="text-xs">Description: {course.description}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}