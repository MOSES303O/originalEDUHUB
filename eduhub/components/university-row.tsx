"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, MapPin, Calendar, Award, ExternalLink, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { UniversityWithCourses } from "@/types";

interface UniversityRowProps {
  university: UniversityWithCourses;
}

export function UniversityRow({ university }: UniversityRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === "keydown" && (e as React.KeyboardEvent).key !== "Enter" && (e as React.KeyboardEvent).key !== " ") {
      return;
    }
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
        <td className="p-3 md:p-4">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </td>
        <td className="p-3 md:p-4 text-gray-900 dark:text-gray-100 font-medium text-sm">
          {university.code?.toUpperCase() || "N/A"}
        </td>
        <td className="p-3 md:p-4">
          <div className="flex items-center gap-3">
            {university.logo ? (
              <Image
                src={university.logo}
                alt={`${university.name} logo`}
                width={40}
                height={40}
                className="rounded-lg border shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">
                  {university.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{university.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{university.type}</p>
            </div>
          </div>
        </td>
        <td className="p-3 md:p-4 text-gray-600 dark:text-gray-300 capitalize text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {university.city}
          </div>
        </td>
        <td className="p-3 md:p-4 text-center">
          <Badge variant="outline" className="text-emerald-600 border-emerald-500 font-medium">
            {university.courseCount || 0} Course{university.courseCount !== 1 ? "s" : ""}
          </Badge>
        </td>
        <td className="p-3 md:p-4 text-center">
          <Badge variant="secondary" className="text-xs">
            Rank #{university.ranking || "N/A"}
          </Badge>
        </td>
        <td className="p-3 md:p-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              asChild
            >
              <Link href={`/university/${university.code}/courses`}>
                <ExternalLink className="w-4 h-4 mr-2" />
                View Courses
              </Link>
            </Button>
          </div>
        </td>
      </tr>

      {/* EXPANDED ROW */}
      {isExpanded && (
        <tr className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <td colSpan={7} className="p-0">
            <div className="p-6 md:p-8 border-l-4 border-emerald-600">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    University Overview
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {university.city}, Kenya
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        TYPE: {university.type || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Accreditation: {university.accreditation || "N/A"}
                      </span>
                    </div>
                    <div><h4 className="text-sm font-semibold">DESCRIPTIONS:</h4><p>{university.description}</p></div>
                  </div>
                </div>

                {/* Course Stats */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Academic Offerings
                  </h4>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-inner">
                    <div className="text-3xl font-bold text-emerald-600">
                      {university.courseCount || 0}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Available Program{university.courseCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Faculties (if available) */}
                {university.faculties && university.faculties.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Faculties ({university.faculties.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {university.faculties.map((faculty) => (
                        <div
                          key={faculty.id}
                          className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {faculty.name}
                          </p>
                          {faculty.courseCount !== undefined && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {faculty.courseCount} course{faculty.courseCount !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="mt-8 flex justify-center">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
                  asChild
                >
                  <Link href={`/university/${university.code}/courses`}>
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Explore All Courses at {university.name}
                  </Link>
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}