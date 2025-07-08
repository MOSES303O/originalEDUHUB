"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown, MapPin, Calendar, Award, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import type { UniversityWithCourses } from "@/types/university"

interface UniversityRowProps {
  university: UniversityWithCourses
  isSelected: boolean
  onSelect: () => void
  onViewCourses: (universityId: number, universityName: string) => void; // Add this property
}

export function UniversityRow({ university, isSelected, onSelect, onViewCourses }: UniversityRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

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
                src="/placeholder.svg?height=32&width=32"
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
            {university.courseCount} Courses
          </Badge>
        </td>
        <td className="p-4 text-center">
          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
            {university.accreditation}
          </Badge>
        </td>
        <td className="p-4">
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={onSelect}
            className={
              isSelected
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            }
          >
            {isSelected ? "Selected" : "Select"}
          </Button>
        </td>
        <td className="p-4">
          <div className="flex gap-2">
            <Link href={`/university/${university.id}/courses`}>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Courses
                    </Button>
            </Link>            
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
                      <span>Established: {university.establishedYear}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Award className="w-4 h-4" />
                      <span>Accreditation: {university.accreditation}</span>
                    </div>
                  </div>
                </div>

                {/* Faculties */}
                <div>
                  <h4 className="text-gray-900 dark:text-gray-100 font-semibold mb-4">
                    Faculties ({university.faculties.length})
                  </h4>
                  <div className="space-y-2">
                    {university.faculties.map((faculty, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">{faculty.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {faculty.courseCount} courses
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {faculty.departments.map((dept, deptIndex) => (
                            <Badge
                              key={deptIndex}
                              variant="outline"
                              className="text-xs border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                            >
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Departments with Course Links */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-gray-900 dark:text-gray-100 font-semibold">
                    Departments ({university.departments.length})
                  </h4>
                  <Link href={`/university/${university.id}/courses`}>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View All Courses
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {university.departments.map((department, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-900 dark:text-gray-100 font-medium text-sm">{department.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {department.courseCount}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {department.courses.slice(0, 3).map((course, courseIndex) => (
                          <div
                            key={courseIndex}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
                          >
                            • {course.name}
                          </div>
                        ))}
                        {department.courses.length > 3 && (
                          <Link href={`/university/${university.id}/courses`}>
                            <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                              +{department.courses.length - 3} more courses →
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
