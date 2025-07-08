"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import type { Course } from "@/types/university"

interface CourseRowProps {
  course: Course
  isSelected: boolean
  onSelect: () => void
  showUniversity?: boolean
}

export function CourseRow({ course, isSelected, onSelect, showUniversity = true }: CourseRowProps) {
  const getQualificationColor = (qualification: string) => {
    switch (qualification.toLowerCase()) {
      case "b":
      case "bachelor":
        return "border-blue-500 text-blue-600 dark:text-blue-400"
      case "b-":
        return "border-yellow-500 text-yellow-600 dark:text-yellow-400"
      case "m":
      case "master":
        return "border-purple-500 text-purple-600 dark:text-purple-400"
      case "phd":
        return "border-red-500 text-red-600 dark:text-red-400"
      default:
        return "border-gray-500 text-gray-600 dark:text-gray-400"
    }
  }

  const getQualificationStatus = (qualification: string) => {
    const qual = qualification.toLowerCase()
    if (qual === "b" || qual === "bachelor")
      return { text: "Qualified", color: "text-emerald-600 dark:text-emerald-400" }
    if (qual === "b-") return { text: "Not Qualified", color: "text-red-600 dark:text-red-400" }
    return { text: "Review Required", color: "text-yellow-600 dark:text-yellow-400" }
  }

  const status = getQualificationStatus(course.qualification)

  return (
    <tr className="border-b">
      <td className="p-4">
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </td>
      <td className="p-4 text-gray-900 dark:text-gray-100 font-medium">{course.id}</td>
      <td className="p-4 text-gray-900 dark:text-gray-100">{course.name}</td>
      {showUniversity && <td className="p-4 text-gray-600 dark:text-gray-300">{course.universityName}</td>}
      <td className="p-4 text-center">
        <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
          {course.requiredPoints || null}
        </Badge>
      </td>
      <td className="p-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <Badge variant="outline" className={getQualificationColor(course.qualification)}>
            {course.qualification}
          </Badge>
          <span className={`text-xs ${status.color}`}>● {status.text}</span>
        </div>
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
        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
          View
        </Button>
      </td>
    </tr>
  )
}
