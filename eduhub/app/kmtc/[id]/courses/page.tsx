import { fetchCoursesByKMTCCampus, fetchKMTCCampuses } from "@/lib/api";
import KMTCCoursesClient from "@/components/kmtc-course-detail-client";
import type { NextPage } from "next";

// Fetch initial data for the campus
async function fetchInitialData(campusCode: string) {
  try {
    console.log("[fetchInitialData] Fetching data for campusCode:", campusCode);
    // Fetch campus name
    const campusData = await fetchKMTCCampuses({ code: campusCode });
    console.log("[fetchInitialData] Fetched campuses:", JSON.stringify(campusData, null, 2));
    if (!Array.isArray(campusData) || campusData.length === 0) {
      console.error("[fetchInitialData] KMTC campus not found for code:", campusCode);
      return { courses: [], campusName: "Unknown KMTC Campus", error: "Campus not found" };
    }

    const campusName = campusData[0].name || "Unknown KMTC Campus";

    // Fetch courses
    const courses = await fetchCoursesByKMTCCampus(campusCode, {});
    console.log("[fetchInitialData] Fetched courses:", JSON.stringify(courses, null, 2));
    if (!Array.isArray(courses)) {
      console.warn("[fetchInitialData] Invalid courses data received:", courses);
      return { courses: [], campusName, error: "Invalid courses data received from API" };
    }

    return { courses, campusName, error: null };
  } catch (error: any) {
    const errorMessage = error.message
      ? JSON.parse(error.message)?.message || error.message
      : "Failed to load campus or courses. Please check your network or API configuration.";
    console.error("[fetchInitialData] Error:", JSON.stringify({ message: errorMessage, error }, null, 2));
    return { courses: [], campusName: "Unknown KMTC Campus", error: errorMessage };
  }
}

// Generate static parameters for KMTC campuses
export async function generateStaticParams() {
  try {
    console.log("[generateStaticParams] Fetching KMTC campuses for static generation");
    const campuses = await fetchKMTCCampuses({});
    console.log("[generateStaticParams] Fetched campuses:", JSON.stringify(campuses, null, 2));

    if (!Array.isArray(campuses)) {
      console.error("[generateStaticParams] Invalid campus data received:", campuses);
      return [];
    }

    const params = campuses
      .filter((campus) => campus.code && typeof campus.code === "string")
      .map((campus) => ({
        id: campus.code, // Map campus code to the [id] dynamic route parameter
      }));

    console.log("[generateStaticParams] Generated params:", JSON.stringify(params, null, 2));
    return params;
  } catch (error: any) {
    console.error("[generateStaticParams] Error:", JSON.stringify(error, null, 2));
    return [];
  }
}

const KMTCCoursesPage: NextPage<{ params: Promise<{ id: string }> }> = async ({ params }) => {
  const { id } = await params;
  console.log("[KMTCCoursesPage] Resolved params:", { id });
  const { courses, campusName, error } = await fetchInitialData(id);
  return (
    <KMTCCoursesClient
      initialCourses={courses}
      initialCampusName={campusName}
      initialError={error}
      campusCode={id}
    />
  );
};

export const dynamic = "force-dynamic"; // Fallback for unmatched campus codes

export default KMTCCoursesPage;