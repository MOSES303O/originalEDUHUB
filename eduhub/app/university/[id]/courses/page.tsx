// frontend/app/university/[id]/courses/page.tsx
import { fetchUniversities, fetchCoursesByUniversity } from "@/lib/api";
import UniversityCoursesClient from "@/components/university-courses-client";
import { Suspense } from "react";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import type { NextPage } from "next";

export async function generateStaticParams() {
  try {
    console.log("[generateStaticParams] Fetching universities for static params");
    const universities = await fetchUniversities();
    return universities.map((uni: any) => ({
      id: uni.code || uni.id.toString(),
    }));
  } catch (error) {
    console.error("[generateStaticParams] Error fetching universities:", error);
    return [];
  }
}

async function fetchInitialData(universityCode: string) {
  try {
    console.log("[fetchInitialData] Fetching data for universityCode:", universityCode);

    if (!universityCode || typeof universityCode !== "string") {
      console.error("[fetchInitialData] Invalid university code:", universityCode);
      throw new Error("Invalid university code");
    }

    // Fetch university basic info (public data, no auth needed)
    const uniResponse = await fetchUniversities({ code: universityCode });
    if (!uniResponse.length) throw new Error("University not found");

    const university = uniResponse[0];

    // Fetch initial courses (public fallback - no qualification yet)
    const initialCourses = await fetchCoursesByUniversity(universityCode);

    return {
      university: {
        ...university,
        courseCount: initialCourses.length,
      },
      initialCourses,
      error: null,
    };
  } catch (err: any) {
    const errorMessage = err.message || "Failed to load university data";
    console.error("[fetchInitialData] Error:", errorMessage);
    return { university: null, initialCourses: [], error: errorMessage };
  }
}

const UniversityCoursesPage: NextPage<{ params: Promise<{ id: string }> }> = async ({ params }) => {
  const { id } = await params;
  console.log("[UniversityCoursesPage] Resolved params:", { id });

  const { university, initialCourses, error } = await fetchInitialData(id);

  return (
    <Suspense fallback={<CoursesSkeleton />}>
      <UniversityCoursesClient
        initialUniversity={university}
        universityCode={id}           // ← Pass code so client can re-fetch with auth
        initialCourses={initialCourses}
        initialError={error}
      />
    </Suspense>
  );
};

export default UniversityCoursesPage;