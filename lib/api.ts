// frontend/api/index.ts
import axios, { AxiosError } from 'axios';
import { University, Subject, Course, SubjectGrades, UserData, Department, Faculty } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface TokenResponse {
  access: string;
  refresh: string;
}

interface ApiError {
  status?: number;
  data?: {
    message?: string;
    errors?: Record<string, any>;
  };
  error_details?: string;
}

// Utility to extract error details
const extractErrorDetails = (error: unknown) => ({
  message: error instanceof Error ? error.message : String(error || 'Unknown error'),
  isAxiosError: axios.isAxiosError(error),
  status: axios.isAxiosError(error) ? error.response?.status : undefined,
  data: axios.isAxiosError(error) ? error.response?.data : undefined,
});

// Fetch CSRF token
const fetchCsrfToken = async () => {
  try {
    const response = await apiClient.get('/get-csrf-token/');
    const csrfToken = response.data.csrfToken;
    console.log("Fetched CSRF token:", csrfToken?.substring(0, 20) + "...");
    return csrfToken;
  } catch (error) {
    console.error("Failed to fetch CSRF token:", JSON.stringify(error, null, 2));
    return null;
  }
};

// Consolidated request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    const publicEndpoints = ['/auth/register/', '/auth/login/', '/get-csrf-token/'];
    const isPublicEndpoint = publicEndpoints.some((pattern) =>
      new RegExp(pattern).test(config.url || '')
    );
    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`Adding Authorization header for ${config.url}: Bearer ${token.substring(0, 20)}...`);
    } else {
      console.log(`No Authorization header for ${config.url}: ${isPublicEndpoint ? 'Public endpoint' : 'No token'}`);
    }
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || (await fetchCsrfToken());
      if (csrfToken) {
        config.headers['X-CSRFTOKEN'] = csrfToken;
        console.log(`Adding CSRF token for ${config.url}: ${csrfToken.substring(0, 20)}...`);
      } else {
        console.warn(`No CSRF token available for ${config.url}`);
      }
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", JSON.stringify(error, null, 2));
    return Promise.reject(error);
  }
);

// Consolidated response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error(`Response error for ${error.config?.url}:`, JSON.stringify({
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    }, null, 2));
    if (
      error.response?.status === 401 &&
      !error.config.url.includes('/auth/login/') &&
      !error.config.url.includes('/auth/profile/me/')
    ) {
      console.log("401 Unauthorized, attempting token refresh");
      try {
        const newToken = await refreshToken();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(error.config); // Retry the original request
      } catch (refreshError) {
        console.error("Token refresh failed:", JSON.stringify(refreshError, null, 2));
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('phone_number');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export async function fetchSubjects(): Promise<Array<{ id: string; name: string }>> {
  try {
    console.log('Fetching subjects...');
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      data: Array<{ value: string; label: string; code: string }>;
    }>('/courses/subjects/');
    console.log('Raw API response:', response.data);
    if (!response.data.success || !Array.isArray(response.data.data)) {
      console.warn('Invalid subjects data received:', response.data);
      return [];
    }
    console.log('Subjects received:', response.data.data);
    return response.data.data.map((s) => ({
      id: s.value,
      name: s.label,
    }));
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to fetch subjects:', errorDetails);
    throw new Error(`Failed to fetch subjects: ${JSON.stringify(errorDetails)}`);
  }
}

export async function fetchCourses(params: Record<string, any> = {}): Promise<Course[]> {
  try {
    console.log('Fetching courses with params:', params);
    const response = await apiClient.get<{ success: boolean; message: string; data: Course[] }>(
      '/courses/courses/',
      { params }
    );
    if (!response.data.success || !Array.isArray(response.data.data)) {
      console.warn('Invalid courses data received:', response.data);
      return [];
    }
    console.log('Courses received:', response.data.data);
    return response.data.data;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to fetch courses:', errorDetails);
    throw new Error(`Failed to fetch courses: ${JSON.stringify(errorDetails)}`);
  }
}

export async function fetchFaculties(universityCode: string): Promise<Faculty[]> {
  try {
    const response = await apiClient.get<{ status: string; message: string; data: Faculty[] }>(
      '/universities/faculties/',
      { params: { university_code: universityCode } }
    );
    if (response.data.status !== 'success' || !Array.isArray(response.data.data)) {
      console.warn('Invalid faculties data received:', response.data);
      return [];
    }
    return response.data.data;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error(`Failed to fetch faculties for university ${universityCode}:`, errorDetails);
    return [];
  }
}

export async function fetchDepartments(facultyId: number): Promise<Department[]> {
  try {
    const response = await apiClient.get<{ status: string; message: string; data: Department[] }>(
      `/universities/faculties/${facultyId}/departments/`
    );
    if (response.data.status !== 'success' || !Array.isArray(response.data.data)) {
      console.warn('Invalid departments data received:', response.data);
      return [];
    }
    return response.data.data;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error(`Failed to fetch departments for faculty ${facultyId}:`, errorDetails);
    return [];
  }
}



export async function fetchCourseCountByFaculty(facultyId: number): Promise<number> {
  try {
    const response = await apiClient.get<{ status: string; message: string; data: Course[] }>(
      '/courses/courses/',
      { params: { faculty_id: facultyId } }
    );
    if (response.data.status !== 'success' || !Array.isArray(response.data.data)) {
      return 0;
    }
    return response.data.data.length;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error(`Failed to fetch course count for faculty ${facultyId}:`, errorDetails);
    return 0;
  }
}
export async function fetchCourseCount(universityCode: string): Promise<number> {
  try {
    if (!universityCode || typeof universityCode !== 'string') {
      console.warn('[fetchCourseCount] Invalid or missing universityCode:', universityCode);
      return 0;
    }
    console.log('[fetchCourseCount] Fetching course count for universityCode:', universityCode);
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      timestamp: string;
      data: Course[];
    }>('/courses/courses/', { params: { university_code: universityCode } });
    console.log('[fetchCourseCount] Raw API response:', JSON.stringify(response.data, null, 2));
    if (!response.data.success || !Array.isArray(response.data.data)) {
      console.warn('[fetchCourseCount] Invalid courses data received:', response.data);
      return 0;
    }
    // Filter courses to ensure they match the requested university_code
    const validCourses = response.data.data.filter(
      (course) => course.university_code === universityCode
    );
    console.log(`[fetchCourseCount] Filtered course count for ${universityCode}:`, validCourses.length);
    return validCourses.length;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('[fetchCourseCount] Failed to fetch course count for university', universityCode, ':', errorDetails);
    return 0;
  }
}

export async function fetchUniversityDetails(code: string): Promise<University> {
  try {
    console.log(`Fetching details for university: ${code}`);
    const response = await apiClient.get<University>(`/universities/universities/${code}/`);
    const data = response.data;
    const courseCount = await fetchCourseCount(code); // Fetch course count separately
    console.log(`Details for ${code}:`, data);
    return {
      ...data,
      available_courses: courseCount,
      faculties: data.faculties ?? [],
      //departments: data.departments ?? [], // Assume backend may return departments
      established_year: data.established_year?.toString() ?? "Unknown",
      accreditation: data.accreditation ?? "N/A",
    };
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error(`Failed to fetch details for ${code}:`, JSON.stringify(errorDetails, null, 2));
    throw new Error(`Failed to fetch university details: ${JSON.stringify(errorDetails)}`);
  }
}

export async function fetchUniversities(params: Record<string, any> = {}): Promise<University[]> {
  try {
    console.log("[fetchUniversities] Fetching with params:", params);
    const response = await apiClient.get<University[]>('/universities/universities/', { params });
    console.log("[fetchUniversities] Raw response:", JSON.stringify(response.data, null, 2));
    const data = response.data;
    if (!Array.isArray(data)) {
      console.warn("[fetchUniversities] Invalid universities data received:", response.data);
      return [];
    }
    console.log("[fetchUniversities] Universities received:", data);
    return data;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error("[fetchUniversities] Failed to fetch universities:", errorDetails);
    throw new Error(`Failed to fetch universities: ${JSON.stringify(errorDetails)}`);
  }
}

export async function fetchCourseById(id: string | number): Promise<Course> {
  try {
    console.log('Fetching course with ID:', id);
    const response = await apiClient.get<Course>(`/courses/courses/${id}/`);
    console.log('Raw course response:', JSON.stringify(response.data, null, 2));
    if (!response.data.id) {
      console.warn('Invalid course data received: missing id', response.data);
      throw new Error('Invalid course data');
    }
    console.log('Course received:', response.data);
    return response.data;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to fetch course:', errorDetails);
    throw new Error(`Failed to fetch course: ${JSON.stringify(errorDetails)}`);
  }
}
export async function fetchCoursesByUniversity(universityCode: string, params: Record<string, string> = {}): Promise<Course[]> {
  try {
    if (!universityCode || typeof universityCode !== 'string') {
      console.warn('[fetchCoursesByUniversity] Invalid or missing universityCode:', universityCode);
      return [];
    }
    console.log('[fetchCoursesByUniversity] Fetching courses for universityCode:', universityCode, 'with params:', params);
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      timestamp: string;
      data: Course[];
    }>('/courses/courses/', { params: { university_code: universityCode, ...params } });
    console.log('[fetchCoursesByUniversity] Raw API response:', JSON.stringify(response.data, null, 2));
    if (!response.data.success || !Array.isArray(response.data.data)) {
      console.warn('[fetchCoursesByUniversity] Invalid courses data received:', response.data);
      return [];
    }
    // Filter courses to ensure they match the requested university_code
    const validCourses = response.data.data.filter(
      (course) => course.university_code === universityCode
    );
    console.log(`[fetchCoursesByUniversity] Filtered courses for ${universityCode}:`, JSON.stringify(validCourses, null, 2));
    return validCourses;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('[fetchCoursesByUniversity] Failed to fetch courses for university', universityCode, ':', errorDetails);
    return [];
  }
}

export async function matchUniversityCampus(courseId: string | number): Promise<string> {
  try {
    const course = await fetchCourseById(courseId);
    const universities = await fetchUniversities();
    const matchedUniversity = universities.find((university: University) =>
      university.code === course.university_code || university.name === course.university_name
    );
    return matchedUniversity?.campus || 'Not specified';
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error(`Failed to match university campus for course ID ${courseId}:`, errorDetails);
    return 'Not specified';
  }
}

export async function matchCourses(subjectGrades: SubjectGrades, totalPoints: number) {
  try {
    const response = await apiClient.post<{ status: string; message: string; data: Course[] }>(
      '/match-courses/',
      { subjectGrades, totalPoints }
    );
    if (response.data.status !== 'success') {
      console.warn('Invalid match courses data received:', response.data);
      throw new Error('Invalid match courses data');
    }
    return response.data.data;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to match courses:', errorDetails);
    throw new Error(`Failed to match courses: ${JSON.stringify(errorDetails)}`);
  }
}

export async function login(phone_number: string, password: string) {
  try {
    const response = await apiClient.post<{
      status: string;
      message: string;
      data: { user: any; tokens: { access: string; refresh: string } };
    }>('/auth/login/', { phone_number, password });
    console.log("Login API response:", JSON.stringify(response.data, null, 2));
    if (response.data.status === 'success') {
      localStorage.setItem('token', response.data.data.tokens.access);
      localStorage.setItem('refreshToken', response.data.data.tokens.refresh);
      localStorage.setItem('phone_number', phone_number);
      return response.data.data;
    }
    const errorDetails = {
      status: response.status,
      data: response.data,
      message: response.data.message || 'Login failed',
    };
    throw new Error(`Login failed: ${JSON.stringify(errorDetails)}`);
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Login failed:', JSON.stringify(errorDetails, null, 2));
    throw new Error(`Login failed: ${JSON.stringify(errorDetails)}`);
  }
}

export const register = async (data: {
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  password: string;
  password_confirm?: string;
  subjects: { subject_id: string; grade: string }[];
}) => {
  try {
    const response = await apiClient.post('/auth/register/', data);
    console.log("Register API response:", response.data);
    localStorage.setItem('refreshToken', response.data.data.tokens.refresh);
    return response.data.data;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error("Register error:", errorDetails);
    throw new Error(JSON.stringify(errorDetails));
  }
};

export async function fetchSelectedCourses(): Promise<Course[]> {
  try {
    const response = await apiClient.get<{ success: boolean; message: string; data: { id: number; course: Course; priority?: number; created_at?: string }[] }>(
      '/user/selected-courses/'
    );
    if (!response.data.success || !Array.isArray(response.data.data)) {
      console.warn('Invalid selected courses data received:', response.data);
      return [];
    }
    const courses = response.data.data.map((item) => ({
      ...item.course,
      selectionId: item.id,
    }));
    console.log('Selected courses received:', courses);
    return courses;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to fetch selected courses:', errorDetails);
    throw new Error(`Failed to fetch selected courses: ${JSON.stringify(errorDetails)}`);
  }
}

export async function insertSelectedCourse(courseId: string | number, priority?: number): Promise<Course> {
  try {
    const response = await apiClient.post<{ success: boolean; message: string; data: { id: number; course: Course; priority?: number; created_at?: string } }>(
      '/user/selected-courses/',
      { course_id: courseId, priority }
    );
    if (!response.data.success || !response.data.data.course) {
      console.warn('Invalid selected course data received:', response.data);
      throw new Error('Invalid selected course data');
    }
    console.log('Selected course inserted:', response.data.data.course);
    return { ...response.data.data.course, selectionId: response.data.data.id };
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to insert selected course:', errorDetails);
    throw new Error(`Failed to insert selected course: ${JSON.stringify(errorDetails)}`);
  }
}

export async function removeSelectedCourse(selectionId: string | number): Promise<void> {
  try {
    const response = await apiClient.delete<{ success: boolean; message: string; data: null }>(
      `/user/selected-courses/${selectionId}/`
    );
    if (!response.data.success) {
      console.warn('Failed to remove selected course:', response.data);
      throw new Error(response.data.message || 'Invalid response');
    }
    console.log('Selected course removed successfully');
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to remove selected course:', errorDetails);
    throw new Error(`Failed to remove selected course: ${JSON.stringify(errorDetails)}`);
  }
}

export async function fetchSelectedUniversities(): Promise<University[]> {
  try {
    const response = await apiClient.get<{ success: boolean; message: string; data: { university: University }[] }>(
      '/user/selected-universities/'
    );
    if (response.data.success && Array.isArray(response.data.data)) {
      return await Promise.all(
        response.data.data.map(async (item) => {
          const courseCount = await fetchCourseCount(item.university.code);
          return {
            ...item.university,
            available_courses: courseCount,
            accreditation: item.university.accreditation ?? 'N/A',
          };
        })
      );
    }
    console.warn('Invalid selected universities data received:', response.data);
    return [];
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to fetch selected universities:', errorDetails);
    throw new Error(`Failed to fetch selected universities: ${JSON.stringify(errorDetails)}`);
  }
}

export async function insertSelectedUniversity(universityCode: string): Promise<University> {
  try {
    const response = await apiClient.post<{ status: string; message: string; data: University }>(
      '/user/selected-universities/',
      { university_code: universityCode }
    );
    if (response.data.status !== 'success') {
      console.warn('Invalid selected university data received:', response.data);
      throw new Error('Invalid selected university data');
    }
    const courseCount = await fetchCourseCount(universityCode);
    return { ...response.data.data, available_courses: courseCount, accreditation: response.data.data.accreditation ?? 'N/A' };
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to insert selected university:', errorDetails);
    throw new Error(`Failed to insert selected university: ${JSON.stringify(errorDetails)}`);
  }
}

export async function removeSelectedUniversity(universityCode: string): Promise<void> {
  try {
    const response = await apiClient.delete<{ success: boolean; message: string; data: null }>(
      `/user/selected-universities/${universityCode}/`
    );
    if (!response.data.success) {
      console.warn('Failed to remove selected university:', response.data);
      throw new Error(response.data.message || 'Invalid response');
    }
    console.log('Selected university removed successfully');
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to remove selected university:', errorDetails);
    throw new Error(`Failed to remove selected university: ${JSON.stringify(errorDetails)}`);
  }
}

export async function refreshToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  try {
    const response = await apiClient.post<TokenResponse>('/auth/token/refresh/', { refresh: refreshToken });
    console.log('Token refresh response:', response.data);
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refreshToken', response.data.refresh);
    return response.data.access;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Token refresh failed:', errorDetails);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    throw new Error(`Token refresh failed: ${JSON.stringify(errorDetails)}`);
  }
}

export async function initiatePayment(amount: number, plan_id: number, phone_number: string, description?: string) {
  try {
    const response = await apiClient.post<{
      status: string;
      message: string;
      data: any;
    }>('/payments/initiate/', { phone_number, amount, plan_id, description });
    if (response.data.status === 'success') {
      return response.data;
    }
    const errorDetails = {
      status: response.status,
      data: response.data,
      message: response.data.message || 'Payment initiation failed',
    };
    throw new Error(`Payment initiation failed: ${JSON.stringify(errorDetails)}`);
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Payment initiation failed:', errorDetails);
    throw new Error(`Payment initiation failed: ${JSON.stringify(errorDetails)}`);
  }
}

export async function verifyPayment(reference: string) {
  try {
    const response = await apiClient.get<{ status: string; message: string; data: any }>(
      `/payments/verify/${reference}/`
    );
    if (response.data.status !== 'success') {
      console.warn('Invalid payment verification data received:', response.data);
      throw new Error('Invalid payment verification data');
    }
    return response.data;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('Payment verification failed:', errorDetails);
    throw new Error(`Payment verification failed: ${JSON.stringify(errorDetails)}`);
  }
}