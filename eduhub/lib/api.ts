// frontend/lib/api.ts
import axios, { AxiosError } from 'axios';
import { University, Course, LoginResponse, SubjectGrades, KMTCCampus, KMTCCourse, Department, Faculty, SelectedCourseResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
console.log('API_BASE_URL initialized:', API_BASE_URL);

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

// Consolidated request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    console.log('Axios Request:', {
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      method: config.method,
      headers: config.headers,
      params: config.params,
      data: JSON.stringify(config.data, null, 2),
    });
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const publicEndpoints = ['/auth/register/', '/auth/login/', '/get-csrf-token/'];
    const isPublicEndpoint = publicEndpoints.some((pattern) =>
      new RegExp(pattern).test(config.url || '')
    );
    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`Adding Authorization header for ${config.url}: Bearer ${token?.substring(0, 20)}...`);
    } else {
      console.log(`No Authorization header for ${config.url}: ${isPublicEndpoint ? 'Public endpoint' : 'No token'}`);
    }
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      const csrfToken = typeof window !== 'undefined'
        ? document.cookie
            .split('; ')
            .find((row) => row.startsWith('csrftoken='))
            ?.split('=')[1] || (await fetchCsrfToken())
        : await fetchCsrfToken();
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
    console.error('Request interceptor error:', extractErrorDetails(error));
    return Promise.reject(error);
  }
);

// Consolidated response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log(`Axios Response for ${response.config.url}:`, {
      status: response.status,
      data: JSON.stringify(response.data, null, 2),
    });
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;
    const url = config?.url || 'unknown';
    const status = error.response?.status;
    const contentType = error.response?.headers['content-type'];
    let errorMessage = error.message || 'Unknown error';
    let responseData = error.response?.data;

    // Handle non-JSON or empty response
    if (!contentType?.includes('application/json') || !responseData) {
      const body = responseData
        ? typeof responseData === 'string'
          ? responseData.slice(0, 500)
          : JSON.stringify(responseData, null, 2)
        : 'Empty response body';
      console.error('Non-JSON or empty response received:', {
        url: `${API_BASE_URL}${url}`,
        status,
        headers: error.response?.headers,
        body,
      });
      errorMessage = `Server returned non-JSON or empty response (status ${status || 'unknown'})`;
      if (status === 204) {
        errorMessage = 'No content returned from server';
      } else if (status === 404 && url.includes('/auth/profile/me/')) {
        errorMessage = 'Profile endpoint not found. Please check if the server is running or contact support.';
      }
      return Promise.reject({
        ...error,
        message: errorMessage,
        response: {
          ...error.response,
          data: { message: errorMessage, body },
        } as any,
      });
    }

    // Handle JSON error responses
    if (responseData && typeof responseData === 'object' && responseData !== null) {
      if ('errors' in responseData && responseData.errors && typeof responseData.errors === 'object') {
        const errors = responseData.errors as Record<string, string[]>;
        errorMessage =
          errors.phone_number?.[0] ||
          errors.password?.[0] ||
          errors.non_field_errors?.[0] ||
          (responseData as any).message ||
          errorMessage;
      } else if ('message' in responseData) {
        errorMessage = (responseData as any).message || errorMessage;
      }
    }

    // Specific status code handling
    if (status === 404 && url.includes('/payments/my-subscriptions/active/')) {
      console.log(`No active subscription for ${url}:`, JSON.stringify(responseData, null, 2));
      return Promise.resolve({
        ...error,
        response: {
          ...error.response,
          data: { success: false, message: 'No active subscription found', data: {} },
        },
      });
    } else if (status === 401) {
      errorMessage = 'Invalid or expired token';
      if (!url.includes('/auth/login/') && !url.includes('/auth/profile/me/')) {
        console.log('401 Unauthorized, attempting token refresh');
        try {
          const newToken = await refreshToken();
          if (config) {
            config.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(config);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', extractErrorDetails(refreshError));
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('phone_number');
            window.location.href = '/login';
          }
        }
      }
    } else if (status === 429) {
      errorMessage = 'Too many requests. Please wait a few minutes and try again.';
    } else if (status === 404 && url.includes('/auth/profile/me/')) {
      errorMessage = 'Profile endpoint not found. Please check if the server is running or contact support.';
    } else if (!status) {
      errorMessage = 'Network error: Unable to connect to the server';
    }

    const errorDetails = {
      message: errorMessage,
      status,
      data: responseData,
      errors: responseData && typeof responseData === 'object' ? (responseData as any).errors : undefined,
      code: error.code,
      url: `${API_BASE_URL}${url}`,
      body: typeof responseData === 'string' ? responseData.slice(0, 500) : JSON.stringify(responseData, null, 2),
    };
    console.error(`Response error for ${url}:`, JSON.stringify(errorDetails, null, 2));

    return Promise.reject({
      ...error,
      message: errorMessage,
      response: {
        ...error.response,
        data: typeof responseData === 'object' && responseData !== null
          ? { ...responseData, message: errorMessage }
          : { message: errorMessage, body: errorDetails.body },
      } as any,
    });
  }
);

interface ErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  [key: string]: any;
}

interface ApiError {
  status?: number;
  data?: ErrorResponse | string | null;
  errors?: Record<string, string[]>;
  error_details?: string;
  code?: string;
  url?: string;
  message: string;
  isAxiosError?: boolean;
}

// Utility to extract error details
const extractErrorDetails = (error: any): ApiError => {
  const axiosError = error as AxiosError<ErrorResponse>;
  let message = axiosError.message || 'Unknown error';
  let data = axiosError.response?.data;
  let status = axiosError.response?.status;
  let url = axiosError.config ? `${axiosError.config.baseURL}${axiosError.config.url || ''}` : 'unknown';

  if (axiosError.response) {
    const headers = axiosError.response.headers as Record<string, string> | undefined;
    const contentType = headers?.['content-type'] || '';
    if (!contentType.includes('application/json') || data == null) {
      message = `Non-JSON response or empty data (status ${status || 'unknown'})`;
      console.error('Non-JSON or empty response received:', {
        url,
        status,
        headers,
        body: typeof data === 'string' ? data : data ?? 'Empty response body',
      });
      data = { message, body: typeof data === 'string' ? data : data ?? 'Empty response body' };
    } else if (typeof data === 'object' && data !== null && 'message' in data) {
      message = data.message || message;
    }
  } else {
    message = axiosError.code === 'ERR_NETWORK'
      ? 'Network error: Unable to connect to the server'
      : 'No response received from the server';
    console.error('No response received:', {
      url,
      code: axiosError.code,
      message,
    });
    data = { message };
  }

  return {
    message,
    status,
    data,
    errors: typeof data === 'object' && data !== null && 'errors' in data ? data.errors : undefined,
    code: axiosError.code,
    url,
    isAxiosError: axiosError.isAxiosError,
  };
};

// Fetch CSRF token
const fetchCsrfToken = async () => {
  try {
    const response = await apiClient.get('/get-csrf-token/');
    const csrfToken = response.data.csrfToken;
    console.log('Fetched CSRF token:', csrfToken?.substring(0, 20) + '...');
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', extractErrorDetails(error));
    return null;
  }
};

export async function fetchCourseById(id: string | number): Promise<Course | null> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    console.log(`Preparing to fetch course with ID: ${id}, Token: ${token ? 'Present' : 'Missing'}`);
    console.log(`Target URL: ${API_BASE_URL}/courses/courses/${id}/`);
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No token found, proceeding without authentication');
    }
    const response = await apiClient.get<Course>(`/courses/courses/${id}/`, {
      headers,
      timeout: 15000,
    });
    console.log('Raw course response:', JSON.stringify(response.data, null, 2));
    if (!response.data?.id) {
      console.warn('Invalid course data received: missing id', response.data);
      return null;
    }
    const courseData = response.data;
    return {
      id: courseData.id.toString(),
      name: courseData.name || 'Unknown',
      code: courseData.code || 'N/A',
      university: {
        id: courseData.university?.id || courseData.universityId || 'unknown',
        name: courseData.university?.name || courseData.university_name || 'Unknown',
        slug: courseData.university?.slug || (courseData.university_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'),
        code: courseData.university?.code || courseData.university_code || undefined,
        logo: courseData.university?.logo || null,
        city: courseData.university?.city || undefined,
        campus: courseData.university?.campus || undefined,
        ranking: courseData.university?.ranking || null,
        accreditation: courseData.university?.accreditation || undefined,
      },
      universityId: courseData.university?.id || courseData.universityId || undefined,
      university_name: courseData.university?.name || courseData.university_name || undefined,
      minimum_grade: courseData.minimum_grade || undefined,
      required_subjects: courseData.required_subjects || undefined,
      description: courseData.description || undefined,
      duration_years: courseData.duration_years || undefined,
      startDate: courseData.startDate ||undefined,
      applicationDeadline: courseData.applicationDeadline || undefined,
      career_prospects: courseData.career_prospects || undefined,
      tuition_fee_per_year: courseData.tuition_fee_per_year != null ? Number(courseData.tuition_fee_per_year) : undefined,
      application_fee: courseData.application_fee != null ? Number(courseData.application_fee) : undefined,
      category: courseData.category || undefined,
      is_selected: courseData.is_selected || false,
      is_applied: courseData.is_applied || false,
      user_application: courseData.user_application || null,
      created_at: courseData.created_at || undefined,
      updated_at: courseData.updated_at || undefined,
    };
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to fetch course:', JSON.stringify(errorDetails, null, 2));
    return null;
  }
}

export async function fetchCourses(params: Record<string, any> = {}): Promise<Course[]> {
  try {
    console.log('Fetching courses with params:', JSON.stringify(params, null, 2));
    console.log('Fetching courses from:', `${API_BASE_URL}/courses/courses/`);
    const headers: Record<string, string> = {};
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No token found, proceeding without authentication');
    }
    const response = await apiClient.get<{ success: boolean; message: string; data: Course[] }>(
      '/courses/courses/',
      { params, headers, timeout: 15000 }
    );
    console.log('Raw courses response:', JSON.stringify(response.data, null, 2));
    if (!response.data.success || !Array.isArray(response.data.data)) {
      console.warn('Invalid courses data received:', JSON.stringify(response.data, null, 2));
      return [];
    }
    console.log('Courses received:', JSON.stringify(response.data.data, null, 2));
    return response.data.data.map((course) => ({
      id: course.id.toString(),
      name: course.name || 'Unknown',
      code: course.code || 'N/A',
      university: {
        id: course.university?.id || course.universityId || 'unknown',
        name: course.university?.name || course.university_name || 'Unknown',
        slug: course.university?.slug || (course.university_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'),
        code: course.university?.code || course.university_code || undefined,
        logo: course.university?.logo || null,
        city: course.university?.city || undefined,
        campus: course.university?.campus || undefined,
        ranking: course.university?.ranking || null,
        accreditation: course.university?.accreditation || undefined,
      },
      universityId: course.university?.id || course.universityId || undefined,
      university_name: course.university?.name || course.university_name || undefined,
      minimum_grade: course.minimum_grade || undefined,
      required_subjects: course.required_subjects || undefined,
      description: course.description || undefined,
      duration_years: course.duration_years || undefined,
      startDate: course.startDate || undefined,
      applicationDeadline: course.applicationDeadline || undefined,
      career_prospects: course.career_prospects || undefined,
      tuition_fee_per_year: course.tuition_fee_per_year != null ? Number(course.tuition_fee_per_year) : undefined,
      application_fee: course.application_fee != null ? Number(course.application_fee) : undefined,
      category: course.category || undefined,
      is_selected: course.is_selected || false,
      is_applied: course.is_applied || false,
      user_application: course.user_application || null,
      created_at: course.created_at || undefined,
      updated_at: course.updated_at || undefined,
    }));
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('Failed to fetch courses:', JSON.stringify(errorDetails, null, 2));
    return [];
  }
}

// Unrelated functions remain unchanged as per your request
export async function login(phone: string, password: string): Promise<LoginResponse['data']> {
  try {
    console.log('Sending login request to:', `${API_BASE_URL}/auth/login/`);
    const response = await apiClient.post<LoginResponse>('/auth/login/', {
      phone_number: phone,
      password,
    }, {
      timeout: 10000,
    });

    console.log('Login response:', JSON.stringify(response.data, null, 2));
    const data = response.data;

    if (!data.success || !data.data || !data.data.tokens) {
      const errorMessage =
        data.errors?.phone_number?.[0] ||
        data.errors?.password?.[0] ||
        data.errors?.non_field_errors?.[0] ||
        data.message ||
        'Login failed: Invalid response structure';
      throw new Error(errorMessage);
    }

    localStorage.setItem('token', data.data.tokens.access);
    localStorage.setItem('refreshToken', data.data.tokens.refresh);
    localStorage.setItem('phone_number', data.data.user.phone_number);
    return data.data;
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('Login API error:', JSON.stringify(errorDetails, null, 2));
    throw new Error(errorDetails.message || 'Login failed due to network error');
  }
}

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

export async function fetchkmtCourseCount(KmtcCode: string): Promise<number> {
  try {
    if (!KmtcCode || typeof KmtcCode !== 'string') {
      console.warn('[fetchCourseCount] Invalid or missing universityCode:', KmtcCode);
      return 0;
    }
    console.log('[fetchCourseCount] Fetching course count for universityCode:', KmtcCode);
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      timestamp: string;
      data: Course[];
    }>('/courses/courses/', { params: { university_code: KmtcCode } });
    console.log('[fetchCourseCount] Raw API response:', JSON.stringify(response.data, null, 2));
    if (!response.data.success || !Array.isArray(response.data.data)) {
      console.warn('[fetchCourseCount] Invalid courses data received:', response.data);
      return 0;
    }
    const validCourses = response.data.data.filter(
      (course) => course.university_code === KmtcCode
    );
    console.log(`[fetchCourseCount] Filtered course count for ${KmtcCode}:`, validCourses.length);
    return validCourses.length;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error('[fetchCourseCount] Failed to fetch course count for university', KmtcCode, ':', errorDetails);
    return 0;
  }
}

export async function fetchUniversityDetails(code: string): Promise<University> {
  try {
    console.log(`Fetching details for university: ${code}`);
    const response = await apiClient.get<University>(`/universities/universities/${code}/`);
    const data = response.data;
    const courseCount = await fetchCourseCount(code);
    console.log(`Details for ${code}:`, data);
    return {
      ...data,
      available_courses: courseCount,
      faculties: data.faculties ?? [],
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

    const universities: University[] = data.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      code: item.code,
      logo: item.logo || null,
      city: item.city || "Unknown City",
      campus: item.campus || "Main Campus",
      faculties: [],
      established_year: "N/A",
      ranking: item.ranking,
      available_courses: 0,
      accreditation: item.accreditation || "N/A",
      description: "No description available",
      is_applied: false,
      selectionId: undefined,
    }));

    console.log("[fetchUniversities] Universities received:", universities);
    return universities;
  } catch (error: unknown) {
    const errorDetails = extractErrorDetails(error);
    console.error("[fetchUniversities] Failed to fetch universities:", errorDetails);
    throw new Error(`Failed to fetch universities: ${JSON.stringify(errorDetails)}`);
  }
}

export async function fetchCoursesByUniversity(universityCode: string, params: Record<string, string> = {}): Promise<Course[]> {
  try {
    if (!universityCode || typeof universityCode !== 'string') {
      console.warn('[fetchCoursesByUniversity] Invalid or missing universityCode:', universityCode);
      return [];
    }
    console.log('[fetchCoursesByUniversity] Fetching courses for universityCode:', universityCode, 'with params:', params);
    const headers: Record<string, string> = {};
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('No token found, proceeding without authentication');
    }
    const response = await apiClient.get<{
      success: boolean;
      message: string;
      timestamp: string;
      data: Course[];
    }>('/courses/courses/', { params: { university_code: universityCode, ...params }, headers, timeout: 15000 });
    console.log('[fetchCoursesByUniversity] Raw API response:', JSON.stringify(response.data, null, 2));
    if (!response.data.success || !Array.isArray(response.data.data)) {
      console.warn('[fetchCoursesByUniversity] Invalid courses data received:', response.data);
      return [];
    }
    const validCourses = response.data.data.filter(
      (course) => course.university_code === universityCode
    ).map((course) => ({
      id: course.id.toString(),
      name: course.name || 'Unknown',
      code: course.code || 'N/A',
      university: {
        id: course.university?.id || course.universityId || 'unknown',
        name: course.university?.name || course.university_name || 'Unknown',
        slug: course.university?.slug || (course.university_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'),
        code: course.university?.code || course.university_code || undefined,
        logo: course.university?.logo || null,
        city: course.university?.city || undefined,
        campus: course.university?.campus || undefined,
        ranking: course.university?.ranking || null,
        accreditation: course.university?.accreditation || undefined,
      },
      universityId: course.university?.id || course.universityId || undefined,
      university_name: course.university?.name || course.university_name || undefined,
      minimum_grade: course.minimum_grade || undefined,
      required_subjects: course.required_subjects || undefined,
      description: course.description || undefined,
      duration_years: course.duration_years || undefined,
      startDate: course.startDate ||  undefined,
      applicationDeadline: course.applicationDeadline || undefined,
      career_prospects: course.career_prospects || undefined,
      tuition_fee_per_year: course.tuition_fee_per_year != null ? Number(course.tuition_fee_per_year) : undefined,
      application_fee: course.application_fee != null ? Number(course.application_fee) : undefined,
      category: course.category || undefined,
      is_selected: course.is_selected || false,
      is_applied: course.is_applied || false,
      user_application: course.user_application || null,
      created_at: course.created_at || undefined,
      updated_at: course.updated_at || undefined,
    }));
    console.log(`[fetchCoursesByUniversity] Filtered courses for ${universityCode}:`, JSON.stringify(validCourses, null, 2));
    return validCourses;
  } catch (error: any) {
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
      university.code === course?.university_code || university.name === course?.university_name
    );
    return matchedUniversity?.campus || 'Not specified';
  } catch (error: any) {
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

export async function register(data: {
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  password: string;
  password_confirm?: string;
  subjects: { subject_id: string; grade: string }[];
}) {
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
}

export async function insertSelectedCourse(courseId: string): Promise<Course> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      throw new Error('No authentication token found');
    }
    console.log('Sending insert selected course request for courseId:', courseId);
    const response = await apiClient.post<SelectedCourseResponse>('/user/selected-courses/', { course: courseId }, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    console.log('Insert selected course response:', JSON.stringify(response.data, null, 2));
    const data = response.data;
    if (!data.success) {
      throw new Error(data.errors?.detail || 'Failed to select course');
    }
    const item = Array.isArray(data.data) ? data.data[0] : data.data;
    if (!item) {
      throw new Error('No valid course data found in the response.');
    }
    return {
      id: item.course.id.toString(),
      name: item.course.name || 'Unknown',
      code: item.course.code || 'N/A',
      university: {
        id: item.course.id || 'unknown',
        name: item.course.university_name || 'Unknown',
        slug: item.course.university_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        code: item.course.university_code || undefined,
        logo: null,
        city: undefined,
        campus: undefined,
        ranking: null,
        accreditation: undefined,
      },
      universityId: item.course.id || undefined,
      university_name: item.course.university_name || undefined,
      minimum_grade: item.course.minimum_grade || undefined,
      description: item.course.description || undefined,
      duration_years: item.course.duration_years || undefined,
      startDate: item.course.start_date || undefined,
      applicationDeadline: item.course.application_deadline || undefined,
      career_prospects: item.course.career_prospects || undefined,
      tuition_fee_per_year: item.course.tuition_fee_per_year != null ? Number(item.course.tuition_fee_per_year) : undefined,
      application_fee: item.course.application_fee != null ? Number(item.course.application_fee) : undefined,
      category: item.course.category || undefined,
      is_selected: true,
      is_applied: item.is_applied || false,
      user_application: item.is_applied ? {
        id: item.id,
        status: item.is_applied ? 'applied' : 'pending',
        application_number: `APP-${item.id}`,
        submitted_at: item.application_date || null,
      } : null,
      created_at: item.created_at || undefined,
      updated_at: item.course.updated_at || undefined,
    };
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('Insert selected course failed:', JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

export async function removeSelectedCourse(selectionId: string): Promise<void> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      throw new Error('No authentication token found');
    }
    console.log('Sending remove selected course request for selectionId:', selectionId);
    const response = await apiClient.delete<SelectedCourseResponse>(`/user/selected-courses/${selectionId}/`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    console.log('Remove selected course response:', JSON.stringify(response.data || 'No content', null, 2));
    if (response.data && !response.data.success) {
      throw new Error(response.data.errors?.detail || 'Failed to deselect course');
    }
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('Remove selected course failed:', JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

export async function fetchSelectedCourses(): Promise<Course[]> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      console.log('No authentication token found in localStorage, returning empty array');
      return [];
    }
    console.log('Sending fetch selected courses request to:', `${apiClient.defaults.baseURL}/user/selected-courses/`);
    const response = await apiClient.get<SelectedCourseResponse>('/user/selected-courses/', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    console.log('Fetch selected courses response:', JSON.stringify(response.data, null, 2));
    const data = response.data;

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      console.log('Empty or invalid response received for selected courses, returning empty array');
      return [];
    }

    if (!data.success) {
      console.warn('Invalid response success status for selected courses:', JSON.stringify(data, null, 2));
      return [];
    }

    if (!data.data || data.data === null) {
      console.log('No data field in response or data is null, returning empty array');
      return [];
    }
    const items = Array.isArray(data.data) ? data.data : [data.data];
    return items.map((item) => ({
      id: item.course.id.toString(),
      name: item.course.name || 'Unknown',
      code: item.course.code || 'N/A',
      university: {
        id: item.course.id || 'unknown',
        name: item.course.university_name || 'Unknown',
        slug: item.course.university_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        code: item.course.university_code || undefined,
        logo: null,
        city: undefined,
        campus: undefined,
        ranking: null,
        accreditation: undefined,
      },
      universityId: item.course.id || undefined,
      university_name: item.course.university_name || undefined,
      minimum_grade: item.course.minimum_grade || undefined,
      description: item.course.description || undefined,
      duration_years: item.course.duration_years || undefined,
      startDate: item.course.start_date || undefined,
      applicationDeadline: item.course.application_deadline || undefined,
      career_prospects: item.course.career_prospects || undefined,
      tuition_fee_per_year: item.course.tuition_fee_per_year != null ? Number(item.course.tuition_fee_per_year) : undefined,
      application_fee: item.course.application_fee != null ? Number(item.course.application_fee) : undefined,
      category: item.course.category || undefined,
      is_selected: true,
      is_applied: item.is_applied || false,
      user_application: item.is_applied ? {
        id: item.id,
        status: item.is_applied ? 'applied' : 'pending',
        application_number: `APP-${item.id}`,
        submitted_at: item.application_date || null,
      } : null,
      created_at: item.created_at || undefined,
      updated_at: item.course.updated_at || undefined,
    }));
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.log('Empty, 404, or expected error response received for selected courses, returning empty array');
    return [];
  }
}
export async function refreshToken(): Promise<string> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  try {
    const response = await apiClient.post<TokenResponse>('/auth/token/refresh/', { refresh: refreshToken });
    console.log('Token refresh response:', response.data);
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refreshToken', response.data.refresh);
    return response.data.access;
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('Token refresh failed:', errorDetails);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('phone_number');
    }
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
  } catch (error: any) {
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
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('Payment verification failed:', errorDetails);
    throw new Error(`Payment verification failed: ${JSON.stringify(errorDetails)}`);
  }
}

export async function fetchKMTCCampuses(params: Record<string, string> = {}): Promise<KMTCCampus[]> {
  try {
    console.log('[fetchKMTCCampuses] Fetching with params:', params);
    const response = await apiClient.get<{ success: boolean; message: string; data: KMTCCampus[] }>(
      '/kmtc/campuses/',
      { params }
    );
    console.log('[fetchKMTCCampuses] Raw API response:', JSON.stringify(response.data, null, 2));
    const data = Array.isArray(response.data) ? response.data : response.data.data || [];
    if (!Array.isArray(data)) {
      console.warn('[fetchKMTCCampuses] Invalid campuses data received:', response.data);
      return [];
    }
    console.log('[fetchKMTCCampuses] Campuses received:', data);
    return data.map(campus => ({
      id: campus.id,
      name: campus.name,
      slug: campus.slug,
      code: campus.code,
      city: campus.city,
      description: campus.description,
    }));
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('[fetchKMTCCampuses] Failed to fetch campuses:', errorDetails);
    throw new Error(`Failed to fetch KMTC campuses: ${JSON.stringify(errorDetails)}`);
  }
}

export async function fetchCoursesByKMTCCampus(campusCode: string, params: Record<string, string> = {}): Promise<KMTCCourse[]> {
  try {
    if (!campusCode || typeof campusCode !== 'string') {
      console.warn('[fetchCoursesByKMTCCampus] Invalid or missing campusCode:', campusCode);
      return [];
    }
    console.log('[fetchCoursesByKMTCCampus] Fetching courses for campusCode:', campusCode, 'with params:', params);
    const response = await apiClient.get<Faculty[]>('/kmtc/programmes/', { params });
    console.log('[fetchCoursesByKMTCCampus] Raw API response:', JSON.stringify(response.data, null, 2));
    const faculties = Array.isArray(response.data) ? response.data : [];
    if (!faculties.every((faculty): faculty is Faculty =>
      typeof faculty.id === 'number' &&
      typeof faculty.name === 'string' &&
      (typeof faculty.university_id === 'number' || faculty.university_id === undefined) &&
      Array.isArray(faculty.departments) &&
      faculty.departments.every((dept): dept is Department =>
        typeof dept.id === 'number' &&
        typeof dept.name === 'string' &&
        (typeof dept.faculty_id === 'number' || dept.faculty_id === undefined)
      )
    )) {
      console.warn('[fetchCoursesByKMTCCampus] Invalid programmes data received:', response.data);
      return [];
    }
    let campusName = 'Unknown KMTC Campus';
    try {
      const campusData = await fetchKMTCCampuses({ code: campusCode });
      if (campusData.length > 0) {
        campusName = campusData[0].name || 'Unknown KMTC Campus';
      }
    } catch (err) {
      console.error('[fetchCoursesByKMTCCampus] Error fetching campus name:', err);
    }
    const courses: KMTCCourse[] = faculties.flatMap((faculty: Faculty) =>
      (faculty.departments || []).map((dept: Department) => ({
        id: dept.id.toString(),
        code: dept.slug ? dept.slug.toUpperCase() : 'UNKNOWN',
        name: dept.name.replace(/^DEPARTMENT OF\s+/i, '') || dept.name,
        department: dept.name,
        required_grade: 'N/A',
        qualification: 'N/A',
        campus_code: campusCode,
        description: dept.description || 'No description available',
        campus_name: campusName,
      }))
    );
    console.log('[fetchCoursesByKMTCCampus] Courses for', campusCode, ':', JSON.stringify(courses, null, 2));
    return courses;
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('[fetchCoursesByKMTCCampus] Failed to fetch courses for campus', campusCode, ':', errorDetails);
    return [];
  }
}

export default apiClient;