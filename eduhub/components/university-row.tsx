// frontend/components/university-row.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, MapPin, Calendar, Award, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { University } from "@/types"; // Import University type from types.ts

interface UniversityRowProps {
  university: University; // Use University type
  onViewCourses: () => void; // Simplified, no parameters needed since using university.code
}

export function UniversityRow({ university, onViewCourses }: UniversityRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Main Row */}
      <tr className="border-b border-gray-200 transition-colors">
        <td className="p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-1"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </td>
        <td className="p-4 text-gray-900 dark:text-gray-100 font-medium">{university.code}</td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            {university.logo ? (
              <Image
                src={university.logo} // Use actual logo URL
                alt={`${university.name} logo`}
                width={32}
                height={32}
                className="rounded border"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-400 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">{university.name.charAt(0)}</span>
              </div>
            )}
            <span className="text-gray-900 dark:text-gray-100 font-medium">{university.name}</span>
          </div>
        </td>
        <td className="p-4 text-gray-600 dark:text-gray-300 capitalize">{university.city}</td>
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
            {university.available_courses ?? 0} Courses
          </Badge>
        </td>
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
            {university.accreditation ?? "N/A"}
          </Badge>
        </td>
        <td className="p-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={onViewCourses}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View Courses
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded Content */}
      {isExpanded && (
        <tr className="border-b border-gray-200 dark:border-gray-800">
          <td colSpan={8} className="p-0">
            <div className="bg-gray-50 dark:bg-gray-800/30 p-6 border-l-4 border-emerald-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* University Details */}
                <div>
                  <h4 className="text-gray-900 dark:text-gray-100 font-semibold mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    University Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <MapPin className="w-4 h-4" />
                      <span className="capitalize">
                        {university.city} - {university.campus}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4" />
                      <span>Established: {university.established_year ?? "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Award className="w-4 h-4" />
                      <span>Accreditation: {university.accreditation ?? "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Faculties */}
                <div>
                  <h4 className="text-gray-900 dark:text-gray-100 font-semibold mb-4">
                    Faculties ({university.faculties?.length ?? 0})
                  </h4>
                  <div className="space-y-2">
                    {university.faculties && university.faculties.length > 0 ? (
                      university.faculties.map((faculty) => (
                        <div
                          key={faculty.id}
                          className="p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                              {faculty.name}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {faculty.courseCount ?? 0} courses
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-600 dark:text-gray-300 text-sm">
                        No faculties available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}