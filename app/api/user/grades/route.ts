import { NextResponse, type NextRequest } from "next/server"
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware"

// Mock user grades database
const userGrades: {
  id: number
  userId: number
  subjectId: number
  grade: string
  examYear: number | null
  createdAt: Date
  updatedAt: Date
}[] = []

async function handleGET(request: AuthenticatedRequest) {
  try {
    const userId = request.user?.id

    // Filter grades by user ID
    const grades = userGrades.filter((grade) => grade.userId === userId)

    return NextResponse.json(grades)
  } catch (error) {
    console.error("Error fetching user grades:", error)
    return NextResponse.json({ error: "Failed to fetch user grades" }, { status: 500 })
  }
}

async function handlePOST(request: AuthenticatedRequest) {
  try {
    const userId = request.user?.id
    const body = await request.json()

    // Validate request body
    if (!body.subjectId || !body.grade) {
      return NextResponse.json({ error: "Subject ID and grade are required" }, { status: 400 })
    }

    // Check if user already has a grade for this subject
    const existingGradeIndex = userGrades.findIndex(
      (grade) => grade.userId === userId && grade.subjectId === body.subjectId,
    )

    // If grade exists, update it
    if (existingGradeIndex !== -1) {
      userGrades[existingGradeIndex] = {
        ...userGrades[existingGradeIndex],
        grade: body.grade,
        examYear: body.examYear || null,
        updatedAt: new Date(),
      }

      return NextResponse.json(userGrades[existingGradeIndex])
    }

    // Otherwise, add new grade
    const newGrade = {
      id: userGrades.length + 1,
      userId: userId!,
      subjectId: body.subjectId,
      grade: body.grade,
      examYear: body.examYear || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    userGrades.push(newGrade)

    return NextResponse.json(newGrade, { status: 201 })
  } catch (error) {
    console.error("Error adding/updating user grade:", error)
    return NextResponse.json({ error: "Failed to add/update grade" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return withAuth(request as AuthenticatedRequest, handleGET)
}

export async function POST(request: NextRequest) {
  return withAuth(request as AuthenticatedRequest, handlePOST)
}
