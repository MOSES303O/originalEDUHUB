// frontend/app/university/page.tsx
import { fetchUniversities, fetchCourseCount } from "@/lib/api";
import { University, UniversityWithCourses } from "@/types";
import UniversityClient from "@/components/university-client";
import { Suspense } from "react";
import { CoursesSkeleton } from "@/components/courses-skeleton";

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

async function fetchInitialData(): Promise<{
  universities: UniversityWithCourses[];
  error: string | null;
}> {
  try {
    console.log("[fetchInitialData] Fetching universities");
    const data = await fetchUniversities();
    console.log("[fetchInitialData] Fetched universities:", data);

    if (!Array.isArray(data)) {
      console.error("[fetchInitialData] Invalid data received:", data);
      throw new Error("Invalid data received from API");
    }

    const enrichedData = await Promise.all(
      data.filter((uni: University) => {
        if (!uni.id || !uni.code || typeof uni.code !== "string") {
          console.warn("[fetchInitialData] Skipping invalid university:", uni);
          return false;
        }
        return true;
      }).map(async (uni: University) => {
        const courseCount = await fetchCourseCount(uni.code!);
        return {
          ...uni,
          courseCount: courseCount, // Maps to available_courses for university-row.tsx
          available_courses: courseCount, // Ensure compatibility with university-row.tsx
          departments: [], // Default, as API doesn't provide
          faculties: uni.faculties ?? [], // Use API-provided or empty
          establishedYear: uni.established_year ?? "Unknown",
          accreditation: uni.accreditation ?? "N/A",
        } as UniversityWithCourses;
      })
    );

    console.log("[fetchInitialData] Enriched universities:", enrichedData);
    return { universities: enrichedData, error: null };
  } catch (err: any) {
    const errorMessage = err.message || "Failed to load universities";
    console.error("[fetchInitialData] Error:", errorMessage);
    return { universities: [], error: errorMessage };
  }
}

export default async function UniversityPage() {
  const { universities, error } = await fetchInitialData();
  return (
    <Suspense fallback={<CoursesSkeleton />}>
      <UniversityClient initialUniversities={universities} initialError={error} />
    </Suspense>
  );
}