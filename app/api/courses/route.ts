import { NextResponse } from "next/server"
import { coursesData } from "./data"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const university = searchParams.get("university")
    let filteredCourses = [...coursesData]

    // Apply filters if provided
    if (search) {
      filteredCourses = filteredCourses.filter((course) => course.title.toLowerCase().includes(search.toLowerCase()))
    }

    if (university) {
      filteredCourses = filteredCourses.filter((course) =>
        course.university.toLowerCase().includes(university.toLowerCase()),
      )
    }

    // Filter by subjects if provided
    const subjects = searchParams.getAll("subject")
    if (subjects.length > 0) {
      filteredCourses = filteredCourses.filter((course) =>
        subjects.some((subject) => course.subjects.includes(subject)),
      )
    }

    // Filter by minimum points
    const minPoints = searchParams.get("min_points")
    if (minPoints) {
      const points = Number.parseInt(minPoints, 10)
      filteredCourses = filteredCourses.filter((course) => course.points <= points)
    }

    return NextResponse.json(filteredCourses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}
