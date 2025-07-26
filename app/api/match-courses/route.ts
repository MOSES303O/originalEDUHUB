import { NextResponse } from "next/server"
import { coursesData } from "../courses/data"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { subjectGrades, totalPoints } = body

    // Extract subject names from the subjectGrades array
    const subjects = subjectGrades.map((sg: { subject: string; grade: string }) => sg.subject)

    // Filter courses based on subjects and points
    const matchedCourses = coursesData.filter((course) => {
      // Check if the course requires subjects that the student has taken
      const hasRequiredSubjects = course.subjects.some((subject) => subjects.includes(subject))

      // Check if the student has enough points for the course
      const hasEnoughPoints = totalPoints >= course.points

      return hasRequiredSubjects && hasEnoughPoints
    })

    // Sort courses by relevance (number of matching subjects)
    matchedCourses.sort((a, b) => {
      const aMatches = a.subjects.filter((subject) => subjects.includes(subject)).length
      const bMatches = b.subjects.filter((subject) => subjects.includes(subject)).length
      return bMatches - aMatches
    })

    return NextResponse.json({
      success: true,
      message: "Courses matched successfully",
      courses: matchedCourses,
    })
  } catch (error) {
    console.error("Error in match-courses API:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 400 })
  }
}
