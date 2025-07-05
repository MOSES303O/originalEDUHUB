// app/api/courses/search/route.ts
import { NextResponse } from "next/server";
import { fetchCourses } from "@/lib/api"; // Ensure this path is correct per tsconfig.json

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Prepare query parameters
    const params: Record<string, string | string[]> = {};

    const search = searchParams.get("search");
    if (search) params.search = search;

    const university = searchParams.get("university");
    if (university) params.university = university;

    const subjects = searchParams.getAll("subject");
    if (subjects.length > 0) params.subject = subjects;

    const minPoints = searchParams.get("min_points");
    if (minPoints) params.min_points = minPoints;

    // Fetch filtered courses from the Django backend
    const courses = await fetchCourses(params);

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses from backend:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses from backend" },
      { status: 500 }
    );
  }
}
