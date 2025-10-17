// frontend/app/courses/[id]/page.tsx
import { fetchCourseById, fetchCourses } from "@/lib/api";
import CourseDetailClient from "@/components/clientcourse";
import type { Course } from "@/types";
import type { NextPage } from "next";

async function fetchInitialData(courseId: string) {
  try {
    console.log('Fetching initial data for course ID:', courseId);
    const course = await fetchCourseById(courseId);
    if (!course) {
      console.warn('No course data returned for ID:', courseId);
      return { course: null, campus: 'Not specified', error: 'Course not found or invalid response' };
    }
    console.log('Fetched course:', JSON.stringify(course, null, 2));
    return { course, campus: course.university.campus || 'Not specified', error: null };
  } catch (error: any) {
    const errorMessage = error.message
      ? JSON.parse(error.message)?.message || error.message
      : 'Failed to load course details. Please check your network or API configuration.';
    console.error('Error fetching initial data:', JSON.stringify({ message: errorMessage, error }, null, 2));
    return { course: null, campus: 'Not specified', error: errorMessage };
  }
}

export async function generateStaticParams() {
  try {
    console.log('Generating static params for courses');
    const courses = await fetchCourses();
    console.log('Courses for static params:', JSON.stringify(courses, null, 2));
    if (!courses.length) {
      console.warn('No courses returned, static params will be empty');
    }
    return courses.map((course: Course) => ({
      id: course.id.toString(),
    }));
  } catch (error) {
    console.error('Error in generateStaticParams:', JSON.stringify(error, null, 2));
    return [];
  }
}

const CourseDetailPage: NextPage<{ params: Promise<{ id: string }> }> = async ({ params }) => {
  const { id } = await params;
  console.log('Resolved params:', { id });
  const { course, campus, error } = await fetchInitialData(id);
  return <CourseDetailClient initialCourse={course} initialCampus={campus} initialError={error} />;
};

export default CourseDetailPage;