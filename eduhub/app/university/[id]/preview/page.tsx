// frontend/app/universities/[code]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Award, ExternalLink, Building2, Users, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { fetchUniversities, fetchCoursesByUniversity, fetchFaculties, fetchDepartments, fetchCourseCount } from "@/lib/api";
import { University, Faculty, Department, Course } from "@/types";
import { CoursesSkeleton } from "@/components/courses-skeleton";
import { AuthenticationModal } from "@/components/authentication-modal";
import { useAuth } from "@/lib/auth-context";

export default function UniversityPreviewPage() {
  const params = useParams();
  const universityCode = params.code as string;
  const router = useRouter();
  const { user } = useAuth();
  const [university, setUniversity] = useState<University | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (user && !user.hasPaid) {
      console.log("[UniversityPreviewPage] User not paid, showing auth modal");
      setShowAuthModal(true);
      setLoading(false);
      return;
    }

    async function loadUniversityData() {
      try {
        setLoading(true);
        setError(null);
        console.log("[loadUniversityData] Fetching data for universityCode:", universityCode);

        // Fetch university by code
        const uniData = await fetchUniversities({ code: universityCode });
        console.log("[loadUniversityData] Fetched universities:", JSON.stringify(uniData, null, 2));
        if (!uniData || !Array.isArray(uniData) || uniData.length === 0) {
          throw new Error("University not found");
        }
        const uni = uniData[0];

        // Fetch course count
        const courseCount = await fetchCourseCount(uni.code);
        console.log(`[loadUniversityData] Course count for ${uni.code}:`, courseCount);

        // Enrich university data
        const enrichedUni = {
          ...uni,
          available_courses: courseCount,
          accreditation: uni.accreditation ?? "N/A",
        };
        console.log("[loadUniversityData] Enriched university:", JSON.stringify(enrichedUni, null, 2));
        setUniversity(enrichedUni);

        // Fetch courses
        const coursesData = await fetchCoursesByUniversity(universityCode);
        console.log("[loadUniversityData] Fetched courses:", JSON.stringify(coursesData, null, 2));
        setCourses(coursesData);

        // Fetch faculties and departments
        const facultiesData = await fetchFaculties(universityCode);
        console.log("[loadUniversityData] Fetched faculties:", JSON.stringify(facultiesData, null, 2));
        setFaculties(facultiesData);

        const allDepartments = await Promise.all(
          facultiesData.map(async (faculty) => {
            const depts = await fetchDepartments(faculty.id);
            console.log(`[loadUniversityData] Fetched departments for faculty ${faculty.id}:`, JSON.stringify(depts, null, 2));
            return depts;
          })
        );
        const flattenedDepartments = allDepartments.flat();
        console.log("[loadUniversityData] All departments:", JSON.stringify(flattenedDepartments, null, 2));
        setDepartments(flattenedDepartments);
      } catch (err: any) {
        const errorDetails = {
          message: err.message || "Unknown error",
          status: err.response?.status,
          data: err.response?.data,
        };
        console.error("[loadUniversityData] Error loading university data:", JSON.stringify(errorDetails, null, 2));
        setError("Failed to load university details. Please try again later.");
        setUniversity(null);
      } finally {
        setLoading(false);
        console.log("[loadUniversityData] Final state:", {
          loading,
          university: JSON.stringify(university, null, 2),
          courses: JSON.stringify(courses, null, 2),
          faculties: JSON.stringify(faculties, null, 2),
          departments: JSON.stringify(departments, null, 2),
          error,
        });
      }
    }

    loadUniversityData();
  }, [universityCode, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
        <Header currentPage="universities" />
        <div className="container mx-auto px-4 py-8">
          <CoursesSkeleton />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !university) {
    return (
      <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
        <Header currentPage="universities" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {error || "University Not Found"}
            </h1>
            <Link href="/university">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Back to Universities</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
      <Header currentPage="universities" />
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <div className="flex items-center mb-8">
          <Link href="/university">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Universities
            </Button>
          </Link>
        </div>

        {/* University Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-shrink-0">
              {university.logo ? (
                <Image
                  src={university.logo}
                  alt={`${university.name} logo`}
                  width={120}
                  height={120}
                  className="rounded-lg border"
                />
              ) : (
                <div className="w-[120px] h-[120px] bg-gradient-to-br from-emerald-500 to-green-400 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{university.name.charAt(0)}</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{university.name}</h1>
                  <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="capitalize">
                        {university.city} - {university.campus}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      <span>Ranking: {university.ranking ?? "N/A"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
                      {university.available_courses ?? 0} Courses
                    </Badge>
                    <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
                      {university.accreditation}
                    </Badge>
                    <Badge variant="outline" className="border-gray-500 text-gray-600 dark:text-gray-400">
                      Code: {university.code}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => router.push(`/universities/${university.code}/courses`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View All Courses
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-300 dark:border-gray-600 bg-transparent"
                    onClick={() => router.push(`/universities/${university.code}/details`)}
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{university.available_courses ?? 0}</h3>
                <p className="text-gray-600 dark:text-gray-300">Total Courses</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{faculties.length}</h3>
                <p className="text-gray-600 dark:text-gray-300">Faculties</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{departments.length}</h3>
                <p className="text-gray-600 dark:text-gray-300">Departments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Faculties and Departments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Faculties */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              Faculties ({faculties.length})
            </h2>
            <div className="space-y-4">
              {faculties.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No faculties available.</p>
              ) : (
                faculties.map((faculty) => (
                  <div
                    key={faculty.id}
                    className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{faculty.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {faculty.courseCount ?? 0} courses
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Departments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              Departments ({departments.length})
            </h2>
            <div className="space-y-3">
              {departments.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No departments available.</p>
              ) : (
                departments.map((department) => (
                  <div
                    key={department.id}
                    className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{department.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {department.courseCount ?? 0} courses
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {department.courses?.slice(0, 3).map((course, courseIndex) => (
                        <div
                          key={courseIndex}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition-colors"
                          onClick={() => router.push(`/courses/${course.id}`)}
                        >
                          • {course.name}
                        </div>
                      ))}
                      {department.courses && department.courses.length > 3 && (
                        <button
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                          onClick={() => router.push(`/universities/${university.code}/courses`)}
                        >
                          +{department.courses.length - 3} more courses →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Featured Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              Featured Courses
            </h2>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => router.push(`/universities/${university.code}/courses`)}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View All Courses
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 6).map((course) => (
              <div
                key={course.id}
                className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight">{course.name}</h3>
                  <Badge
                    variant="outline"
                    className="text-xs border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  >
                    {course.minimum_grade ?? "N/A"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{course.department ?? "N/A"}</span>
                  <Badge variant="secondary" className="text-xs">
                    {course.code}
                  </Badge>
                </div>
              </div>
            ))}
            {courses.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 col-span-3">No courses available.</p>
            )}
          </div>
        </div>
      </div>
      <Footer />
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={false} />}
    </div>
  );
}