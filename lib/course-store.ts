"use client"

// Simple client-side store for selected courses
import { useState, useEffect } from "react"

// Define course type
export interface Course {
  id: string
  code: string
  title: string
  university: string
  description: string
  points: number
  fullDescription?: string
  subjects?: string[]
  duration?: string
  startDate?: string
  applicationDeadline?: string
  campuses?: string[]
  careers?: string[]
}

// Hook to manage selected courses
export function useSelectedCourses() {
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([])

  // Load selected courses from localStorage on initial render
  useEffect(() => {
    const storedCourses = localStorage.getItem("selectedCourses")
    if (storedCourses) {
      try {
        setSelectedCourses(JSON.parse(storedCourses))
      } catch (error) {
        console.error("Failed to parse stored courses:", error)
        localStorage.removeItem("selectedCourses")
      }
    }
  }, [])

  // Save to localStorage whenever selectedCourses changes
  useEffect(() => {
    localStorage.setItem("selectedCourses", JSON.stringify(selectedCourses))
  }, [selectedCourses])

  // Add a course to selected courses
  const addCourse = (course: Course) => {
    setSelectedCourses((prev) => {
      // Check if course already exists
      if (prev.some((c) => c.id === course.id)) {
        return prev
      }
      return [...prev, course]
    })
  }

  // Remove a course from selected courses
  const removeCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((course) => course.id !== courseId))
  }

  // Check if a course is selected
  const isCourseSelected = (courseId: string) => {
    return selectedCourses.some((course) => course.id === courseId)
  }

  // Toggle course selection
  const toggleCourseSelection = (course: Course) => {
    if (isCourseSelected(course.id)) {
      removeCourse(course.id)
    } else {
      addCourse(course)
    }
  }

  return {
    selectedCourses,
    addCourse,
    removeCourse,
    isCourseSelected,
    toggleCourseSelection,
  }
}
