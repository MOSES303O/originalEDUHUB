// frontend/app/university/[id]/courses/page.tsx
import { fetchUniversities, fetchCoursesByUniversity } from "@/lib/api";
import { University, UniversityWithCourses, Course } from "@/types";
import UniversityCoursesClient from "@/components/university-courses-client";
import { Suspense } from "react";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import type { NextPage } from "next";

export async function generateStaticParams() {
  try {
    console.log("[generateStaticParams] Fetching universities for static params");
    const universities = await fetchUniversities();
    console.log("[generateStaticParams] Universities fetched:", universities);

    if (!Array.isArray(universities) || universities.length === 0) {
      console.warn("[generateStaticParams] No universities found, returning empty params");
      return [];
    }

    return universities.map((university: University) => ({
      id: university.code || university.id.toString(),
    }));
  } catch (error) {
    console.error("[generateStaticParams] Error fetching universities:", error);
    return [];
  }
}

async function fetchInitialData(universityCode: string): Promise<{
  university: UniversityWithCourses | null;
  courses: Course[];
  error: string | null;
}> {
  try {
    console.log("[fetchInitialData] Fetching data for universityCode:", universityCode);

    if (!universityCode || typeof universityCode !== "string") {
      console.error("[fetchInitialData] Invalid university code:", universityCode);
      throw new Error("Invalid university code");
    }

    // Fetch university
    console.log("[fetchInitialData] Fetching university for code:", universityCode);
    const uniData = await fetchUniversities({ code: universityCode });
    console.log("[fetchInitialData] Fetched universities:", uniData);

    if (!Array.isArray(uniData) || uniData.length === 0) {
      console.error("[fetchInitialData] University not found for code:", universityCode);
      throw new Error("University not found");
    }

    const university = uniData[0];
    const enrichedUniversity: UniversityWithCourses = {
      ...university,
      courseCount: 0, // Will be updated after fetching courses
      departments: [], // API doesn't provide, set empty
      faculties: university.faculties ?? [],
      establishedYear: university.established_year ?? "Unknown",
      accreditation: university.accreditation ?? "N/A",
    };

    // Fetch courses
    console.log("[fetchInitialData] Fetching courses for universityCode:", universityCode);
    const courses = await fetchCoursesByUniversity(universityCode, {});
    console.log("[fetchInitialData] Fetched courses:", courses);

    if (!Array.isArray(courses)) {
      console.error("[fetchInitialData] Invalid courses data received:", courses);
      throw new Error("Invalid courses data received");
    }

    // Update courseCount
    enrichedUniversity.courseCount = courses.length;

    console.log("[fetchInitialData] Enriched data:", { university: enrichedUniversity, courses });
    return { university: enrichedUniversity, courses, error: null };
  } catch (err: any) {
    const errorMessage = err.message || "Failed to load data";
    console.error("[fetchInitialData] Error:", errorMessage);
    return { university: null, courses: [], error: errorMessage };
  }
}

const UniversityCoursesPage: NextPage<{ params: Promise<{ id: string }> }> = async ({ params }) => {
  const { id } = await params;
  console.log("[UniversityCoursesPage] Resolved params:", { id });
  const { university, courses, error } = await fetchInitialData(id);
  return (
    <Suspense fallback={<CoursesSkeleton />}>
      <UniversityCoursesClient
        initialUniversity={university}
        initialCourses={courses}
        initialError={error}
      />
    </Suspense>
  );
};

export default UniversityCoursesPage;