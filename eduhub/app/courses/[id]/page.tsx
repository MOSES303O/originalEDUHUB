// app/courses/[id]/page.tsx
import { fetchCourseById, fetchCourses } from "@/lib/api";
import CourseDetailClient from "@/components/clientcourse";
import type { Course } from "@/types";
import { Suspense } from "react";

// Server-side data fetching
async function fetchInitialData(courseId: string) {
  try {
    console.log("Fetching initial course data for ID:", courseId);
    const course = await fetchCourseById(courseId);

    if (!course) {
      return { course: null, error: "Course not found or unavailable." };
    }

    return { course, error: null };
  } catch (error: any) {
    console.error("Error in fetchInitialData:", error);
    return { course: null, error: "Failed to load course. Please try again later." };
  }
}

// Generate static paths for all courses (SSG)
export async function generateStaticParams() {
  try {
    const courses = await fetchCourses({});
    return courses.map((course: Course) => ({
      id: course.id?.toString() || "", // safe guard if id is optional
    })).filter(param => param.id !== ""); // skip invalid
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

// Main page component (Server Component)
export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { course, error } = await fetchInitialData(id);

  return (
    <Suspense fallback={<div>Loading course details...</div>}>
      <CourseDetailClient initialCourse={course} initialError={error} />
    </Suspense>
  );
}