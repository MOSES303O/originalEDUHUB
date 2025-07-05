// frontend/lib/api.ts
import axios from 'axios';
import { University } from "@/types";
import { Course, SubjectGrades, UserData } from '@/types';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API functions
export async function fetchSubjects() {
  try {
    const response = await apiClient.get('/courses/subjects/');
    return response.data.map((subject: any) => ({
      value: subject.code,  // or subject.id
      label: subject.name,
    }))
  } catch (error) {
    console.error('Failed to fetch subjects:', error);
    return [
      { value: "mathematics", label: "Mathematics" },
      { value: "kiswahili", label: "Kiswahili" },
      { value: "english", label: "English" },
      { value: "biology", label: "Biology" },
      { value: "chemistry", label: "Chemistry" },
      { value: "physics", label: "Physics" },
      { value: "history", label: "History" },
      { value: "geography", label: "Geography" },
      { value: "business_studies", label: "Business Studies" },
      { value: "computer_studies", label: "Computer Studies" },
      { value: "agriculture", label: "Agriculture" },
    ]
  }
}
//fetch courses
export async function fetchCourses(params = {}) {
  try {
    const response = await apiClient.get('/courses/courses/', { params });
    return response.data.results ?? response.data; // failsafe
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error;
  }
}
// Fetch universities
export async function fetchUniversities(params = {}){
  try {
    const response = await apiClient.get('/universities/universities/', { params });
    return response.data.results ?? response.data; // Returns the list of universities
  } catch (error) {
    console.error('Failed to fetch universities:', error);
    throw error;
  }
}

export async function fetchCourseById(id: string | number) {
  try {
    const response = await apiClient.get(`/courses/courses/${id}/`);
    console.log("Course API Response:", response.data); // Debug
    return response.data.results ?? response.data; // Ensure this handles the response correctly
  } catch (error) {
    console.error(`Failed to fetch course with id ${id}:`, error);
    throw error;
  }
}
// Match university campus with course
export async function matchUniversityCampus(courseId: string | number): Promise<string> {
  try {
    const course = await fetchCourseById(courseId);
    const universities = await fetchUniversities();

    const matchedUniversity = universities.find((university: University) =>
      university.code === course.university_code || university.name === course.university_name
    );

    return matchedUniversity?.campus || "Not specified";
  } catch (error) {
    console.error(`Failed to match university campus for course ID ${courseId}:`, error);
    return "Not specified";
  }
}
export async function matchCourses(subjectGrades: SubjectGrades, totalPoints: number) {
  try {
    const response = await apiClient.post('/match-courses/', { subjectGrades, totalPoints });
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Failed to match courses:', error);
    throw error;
  }
}

export async function login(username : string, password: string) {
  try {
    const response = await apiClient.post('/login/', { username, password });
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
// Fetch all selected courses by the user
export async function fetchSelectedCourses(): Promise<Course[]> {
  try {
    const response = await apiClient.get('/user/selected-courses/');
    const apiData = response.data;

    if (apiData.success && Array.isArray(apiData.data)) {
      // Extract the `course` objects from the response
      return apiData.data.map((item: { course: Course }) => item.course);
    } else {
      throw new Error("Unexpected API response structure");
    }
  } catch (error: unknown) {
    console.error("Failed to fetch selected courses:", error);
    throw error; // Rethrow the error for further handling
  }

}
// post a selected course into the database
export async function insertSelectedCourse(courseId: string | number): Promise<Course> {
  try {
    const response = await apiClient.post('/user/selected-courses/', { courseId });
    return response.data.results ?? response.data; // Return the inserted course data
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Failed to insert selected course:', error.message);
    } else {
      console.error('An unknown error occurred while inserting selected course:', error);
    }
    throw error; // Rethrow the error for further handling
  }
}
export async function register(userData:UserData) {
  try {
    const response = await apiClient.post('/register/', userData);
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export async function refreshToken(refreshToken: string): Promise<{ access: string; refresh: string }> {
  try {
    //fixme: replace with your backend URL
    const response = await fetch("https://your-backend-url.com/api/token/refresh/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();

    // Ensure the response contains the required tokens
    if (!data.access || !data.refresh) {
      throw new Error("Invalid token response from server");
    }

    return {
      access: data.access,
      refresh: data.refresh,
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error; // Re-throw the error to handle it in the calling code
  }
}

export async function processPayment(userId: number | string) {
  try {
    const response = await apiClient.post('/process-payment/', { user_id: userId });
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
}

export async function generatePDF(courses: Course[], userName = 'Student') {
  try {
    const response = await apiClient.post('/generate-pdf/', { courses, userName }, {
      responseType: 'blob',
    });
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw error;
  }
}