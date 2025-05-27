// frontend/lib/api.ts
import axios from 'axios';
import { Course, SubjectGrades, UserData } from '@/types';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
    const response = await apiClient.get('/subjects/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch subjects:', error);
    // Fallback to hardcoded subjects if API fails
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
    ];
  }
}

export async function fetchCourses(params = {}) {
  try {
    const response = await apiClient.get('/courses/', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error;
  }
}

export async function fetchCourseById(id: string | number) {
  try {
    const response = await apiClient.get(`/courses/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch course with id ${id}:`, error);
    throw error;
  }
}

export async function matchCourses(subjectGrades: SubjectGrades, 
  totalPoints: number) {
  try {
    const response = await apiClient.post('/match-courses/', { subjectGrades, totalPoints });
    return response.data;
  } catch (error) {
    console.error('Failed to match courses:', error);
    throw error;
  }
}

export async function login(username : string, password: string) {
  try {
    const response = await apiClient.post('/login/', { username, password });
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function register(userData:UserData) {
  try {
    const response = await apiClient.post('/register/', userData);
    return response.data;
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
    return response.data;
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
    return response.data;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw error;
  }
}