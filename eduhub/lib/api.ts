// frontend/lib/api.ts — FINAL VERSION
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  University, ContactFormData, ContactFormResponse, Course,
  KMTCCampus, KMTCCourse, Department, Programme
} from '@/types';

const isDevelopment = process.env.NODE_ENV === 'development';
const mybaseurl = isDevelopment
  ? process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL
  : process.env.NEXT_PUBLIC_API_BASE_URL_DEPLOY;

console.log('API Base URL:', mybaseurl);

// Axios instance
const apiClient = axios.create({
  baseURL: mybaseurl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// UNIVERSAL DATA EXTRACTOR
const getResponseData = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if ('data' in data) return Array.isArray(data.data) ? data.data : [];
    if ('results' in data) return Array.isArray(data.results) ? data.results : [];
  }
  return [];
};

// GET CSRF TOKEN
const getCsrfToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const name = "csrftoken=";
  const cookies = document.cookie.split("; ");
  for (const cookie of cookies) {
    if (cookie.startsWith(name)) {
      return decodeURIComponent(cookie.substring(name.length));
    }
  }
  return null;
};

// REQUEST INTERCEPTOR
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig<any>): InternalAxiosRequestConfig<any> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const publicEndpoints = ["/auth/register/", "/auth/login/", "/get-csrf-token/"];
    const isPublic = publicEndpoints.some(ep => config.url?.includes(ep));

    if (token && !isPublic) {
      config.headers.set("Authorization", `Bearer ${token}`);
      console.log(`[Axios Request] Adding Bearer token to ${config.url} (token length: ${token.length})`);
    }

    if (["post", "put", "patch", "delete"].includes(config.method?.toLowerCase() || "")) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers.set("X-CSRFToken", csrfToken);
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const contentType = error.response?.headers?.["content-type"] || "";
    const url = error.config?.url || "";

    if (status === 401 || status === 403) {
      const isJson = contentType.includes("application/json");
      const data = error.response?.data as any;

      if (isJson && (data?.detail?.includes("authenticated") || data?.message?.includes("login"))) {
        console.warn("Auth failed → logging out", { url, status });
        localStorage.clear();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return new Promise(() => {});
      }
    }

    if (status === 204) {
      return Promise.resolve({ data: null, status: 204, statusText: "No Content", headers: {}, config: error.config! });
    }

    return Promise.reject(error);
  }
);

// ERROR EXTRACTOR
export const extractErrorDetails = (error: any) => {
  if (!error) return { message: "Unknown error" };
  return {
    status: error.response?.status,
    data: error.response?.data,
    message: error.message,
    code: error.code,
    detail: error.response?.data?.detail || error.response?.data?.non_field_errors?.[0],
  };
};

// REFRESH TOKEN
export const refreshToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token");

  const response = await apiClient.post("/auth/token/refresh/", { refresh: refreshToken });
  const newAccess = response.data.access;
  localStorage.setItem("token", newAccess);
  return newAccess;
}
apiClient.interceptors.request.use((config) => {
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token");
  }

  // Skip adding token for payment initiation (expired users won't have valid one)
  if (token && !config.url?.includes('/payments/initiate/')) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// AUTH
export const login = async (phone: string, password: string) => {
  const cleanPhone = phone.replace(/^\+/, "");

  try {
    const response = await apiClient.post("/auth/login/", {
      phone_number: cleanPhone,
      password,
    });

    console.log("RAW LOGIN RESPONSE:", JSON.stringify(response.data, null, 2));

    const payload = response.data;

    // Be more flexible — try all common locations for token
    let accessToken =
      payload.access ||
      payload.data?.access ||
      payload.tokens?.access ||
      payload.data?.tokens?.access;

    let refreshToken =
      payload.refresh ||
      payload.data?.refresh ||
      payload.tokens?.refresh ||
      payload.data?.tokens?.refresh;

    let user = payload.user || payload.data?.user || payload.data;

    if (!accessToken) {
      throw new Error("No access token found in login response");
    }

    localStorage.setItem("token", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

    // Debug: confirm it's saved
    console.log("TOKEN SAVED:", localStorage.getItem("token")?.substring(0, 20) + "...");

    return { tokens: { access: accessToken, refresh: refreshToken }, user };
  } catch (error: any) {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      "Invalid phone number or password";

    console.error("LOGIN FAILED:", msg);
    throw new Error(msg);
  }
};
export const register = async (data: {
  phone_number: string;
  password: string;
  password_confirm: string;
  subjects: Array<{ subject_id: string; grade: string }>;
}) => {
  try {
    const response = await apiClient.post('/auth/register/', data);
    console.log("FULL REGISTER RESPONSE:", JSON.stringify(response.data, null, 2));

    const res = response.data;

    if (res.status !== "success" || !res.data) {
      console.error("Server returned error:", res);
      throw new Error(res.message || "Registration failed");
    }

    const payload = res.data;
    const accessToken = payload.tokens?.access;
    const refreshToken = payload.tokens?.refresh;
    const user = payload.user;

    if (!accessToken || !user?.phone_number) {
      console.error("Missing tokens or user in payload:", payload);
      throw new Error("Invalid registration response from server");
    }

    localStorage.setItem("token", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("phone_number", user.phone_number.replace("+", ""));

    return {
      tokens: { access: accessToken, refresh: refreshToken },
      user: { phone_number: user.phone_number, is_premium: user.is_premium || false },
    };
  } catch (error: any) {
    console.error("REGISTRATION FAILED WITH SERVER RESPONSE:", error.response?.data || error.message);
    throw error;
  }
};

// SUBJECTS
export async function fetchSubjects(): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await apiClient.get('/courses/subjects/');
    const list = getResponseData(response.data);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list.map((s: any) => ({
      id: s.value || s.id || '',
      name: s.label || s.name || 'Unknown',
    }));
  } catch (error) {
    console.error('Failed to fetch subjects:', extractErrorDetails(error));
    return [];
  }
}
//fetch course count by faculties
export async function fetchCourseCountByFaculty(facultyId: number): Promise<number> {
  try {
    const response = await apiClient.get<{ status: string; message: string; data: Course[] }>(
      '/courses/offerings/',
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
//faculties
export async function fetchDepartments(facultyId: number): Promise<Department[]> {
  try {
    const response = await apiClient.get(`/universities/faculties/${facultyId}/departments/`);
    return getResponseData(response.data);
  } catch (error) {
    console.error('Failed to fetch departments:', extractErrorDetails(error));
    return [];
  }
}

// UNIVERSITIES
export async function fetchUniversities(params: Record<string, any> = {}): Promise<University[]> {
  try {
    const response = await apiClient.get('/universities/universities/', { params });
    const data = getResponseData(response.data);
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [data[i], data[j]] = [data[j], data[i]];
    }

    if (!Array.isArray(data)) {
        console.warn("[fetchUniversities] Invalid universities data received:", response.data);
        return [];
      }
  
    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      code: item.code,
      logo: item.logo || null,
      city: item.city || "Unknown City",
      campus: item.campus || "Main Campus",
      faculties: [],
      established_year: "N/A",
      type: item.type || "N/A",
      ranking: item.ranking,
      available_courses: 0,
      accreditation: item.accreditation || "N/A",
      description: item.description || "No description available",
      is_applied: false,
      selectionId: undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch universities:', extractErrorDetails(error));
    return [];
  }
}

export async function fetchUniversityDetails(code: string): Promise<University> {
  try {
    console.log(`Fetching details for university: ${code}`);
    const response = await apiClient.get<University>(`/universities/universities/${code}/`);
    const data = response.data;
    const count = await fetchCourseCount(code);
    console.log(`Details for ${code}:`, data);
    return {
      ...data,
      courses_count: count,
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

export async function matchUniversityCampus(courseId: string ): Promise<string> {
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

export async function fetchCoursesByUniversity(universityCode: string): Promise<Course[]> {
  try {
    const response = await apiClient.get('/courses/offerings/', {
      params: { university_code: universityCode }
    });
    const res = response.data;

    if (!res.success || !Array.isArray(res.data)) return [];

    const list = res.data;
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    return list.map((offering: any) => {
      const program = offering.program || {};
      const university = offering.university || {};

      return {
        id: offering.id.toString(),
        name: program.name || "Unknown Program",
        code: offering.code?.toString() || "N/A",
        category: program.category || "General",
        university: {
          id: university.id?.toString() || "unknown",
          name: university.name || offering.university_name || "Unknown",
          code: university.code || offering.university_code,
          logo: university.logo || null,
        },
        cluster_requirements: offering.cluster_requirements || "",
        minimum_grade: offering.minimum_grade,
        duration_years: offering.duration_years || program.typical_duration_years,
        tuition_fee_per_year: offering.tuition_fee_per_year != null 
          ? Number(offering.tuition_fee_per_year) 
          : undefined,
        career_prospects: offering.career_prospects || "",
        intake_months: offering.intake_months || [],
        required_subjects: (offering.subject_requirements || []).map((req: any) => ({
          subject: {
            id: req.subject?.value || "",
            name: req.subject?.label || "Unknown Subject",
          },
          minimum_grade: req.minimum_grade || "",
          is_mandatory: req.is_mandatory || false,
        })),
        is_selected: !!offering.is_selected,
        is_applied: !!offering.is_applied,
        // ────────────────────────────────────────────────
        // ADD THESE LINES – qualification fields from engine
        qualified: offering.qualified ?? null,
        user_points: offering.user_points ?? null,
        required_points: offering.required_points ?? null,
        points_source: offering.points_source ?? null,
        cluster: offering.cluster ?? null,
        qualification_details: offering.qualification_details ?? {},
        // ────────────────────────────────────────────────
      };
    });
  } catch (error) {
    console.error("Failed to fetch courses for university:", extractErrorDetails(error));
    return [];
  }
}
//using ourses/courses for the count
export async function fetchCourseCount(universityCode: string): Promise<number> {
  try {
    const response = await apiClient.get('/courses/offerings/', { params: { university_code: universityCode } });
    const list = getResponseData(response.data);
    return list.filter((c: any) => c.university_code === universityCode).length;
  } catch {
    return 0;
  }
}

// COURSES (NEW: CourseOffering)
export async function fetchCourses(params: Record<string, any> = {}): Promise<Course[]> {
  try {
    const response = await apiClient.get('/courses/offerings/', { params });
    const res = response.data;

    if (!res.success || !Array.isArray(res.data)) return [];

    const list = res.data;
    // Shuffle the array (Fisher-Yates / modern shuffle)
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    return list.map((offering: any) => {
      const program = offering.program || {};
      const university = offering.university || {};

      return {
        id: offering.id.toString(),
        name: program.name || "Unknown Program",
        code: offering.code?.toString() || "N/A",
        category: program.category || "General",
        university: {
          id: university.id?.toString() || "unknown",
          name: university.name || offering.university_name || "Unknown",
          code: university.code || offering.university_code,
          logo: university.logo || null,
        },
        cluster_requirements: offering.cluster_requirements || "",
        minimum_grade: offering.minimum_grade,
        duration_years: offering.duration_years || program.typical_duration_years,
        tuition_fee_per_year: offering.tuition_fee_per_year != null 
          ? Number(offering.tuition_fee_per_year) 
          : undefined,
        career_prospects: offering.career_prospects || "",
        intake_months: offering.intake_months || [],
        required_subjects: (offering.subject_requirements || []).map((req: any) => ({
          subject: {
            id: req.subject?.value || "",
            name: req.subject?.label || "Unknown Subject",
          },
          minimum_grade: req.minimum_grade || "",
          is_mandatory: req.is_mandatory || false,
        })),
        is_selected: !!offering.is_selected,
        is_applied: !!offering.is_applied,
        // NEW: Qualification from engine
        qualified: offering.qualified ?? null,
        user_points: offering.user_points ?? null,
        required_points: offering.required_points ?? null,
        points_source: offering.points_source ?? null,
        cluster: offering.cluster ?? null,
        qualification_details: offering.qualification_details ?? {},
      };
    });
  } catch (error) {
    console.error('Failed to fetch courses:', extractErrorDetails(error));
    return [];
  }
}
//kmtc course count
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
export async function fetchCourseById(id: string): Promise<Course | null> {
  try {
    console.log(`Fetching course detail for ID: ${id}`);
    const response = await apiClient.get(`/courses/offerings/${id}/`);
    const res = response.data;

    console.log("Raw course detail response:", JSON.stringify(res, null, 2));

    if (!res.success || !res.data) {
      console.warn("Invalid response format:", res);
      return null;
    }

    const data = res.data;
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [data[i], data[j]] = [data[j], data[i]];
    }

    const program = data.program || {};
    const university = data.university || {};

    return {
      id: data.id.toString(),
      name: program.name || "Unknown Program",
      code: data.code?.toString() || "N/A",  // ← USE data.code, NOT program.code
      category: program.category || "General",
      university: {
        id: university.id?.toString() || "unknown",
        name: university.name || "Unknown University",
        slug: university.name?.toLowerCase().replace(/\s+/g, '-') || "unknown",
        code: university.code || undefined,
        logo: university.logo || null,
        city: university.city || undefined,
        campus: university.campus || undefined,
        ranking: university.ranking || null,
        accreditation: university.accreditation || undefined,
      },
      university_name: university.name,
      universityId: university.id,
      minimum_grade: data.minimum_grade,
      duration_years: data.duration_years || program.typical_duration_years,
      tuition_fee_per_year: data.tuition_fee_per_year != null 
        ? Number(data.tuition_fee_per_year) 
        : undefined,
      intake_months: data.intake_months || [],
      career_prospects: data.career_prospects || "",
      details: program.details || data.details || "",
      required_subjects: program.required_subjects || [],
      is_selected: !!data.is_selected,
      is_applied: !!data.is_applied,
      created_at: data.created_at,
      updated_at: data.updated_at,
      selectionId: data.selectionId,
    };
  } catch (error: any) {
    const details = extractErrorDetails(error);
    console.error("Failed to fetch course detail:", details);
    return null;
  }
}
// SELECTED COURSES
export async function insertSelectedCourse(courseCode: string | number): Promise<Partial<Course>> {
  try {
    const response = await apiClient.post('/user/selected-courses/', { course_code: courseCode });
    const data = response.data.data || response.data || {};
    console.log("RAW INSERT RESPONSE:", JSON.stringify(response.data, null, 2));

    return {
      id: data.id || data.selectionId || response.data?.id,                     // ← real selection PK (UUID)
      selectionId: data.id,             // ← same
      code: courseCode,
      name: data.course_name || "Unknown Course",
      university_name: data.institution === "KMTC" ? "KMTC" : data.institution,
      institution: data.institution,
      is_selected: true,
    };
  } catch (error: any) {
    if (error.response?.status === 400) {
      const msg = (error.response.data?.non_field_errors?.[0] || "").toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("selected")) {
        // Treat as success (idempotent) - return fake success object
        console.log("Course already selected - treating as success");
        return {
          code: courseCode,
          is_selected: true,
          selectionId: "already-exists", // marker so store knows
        };
      }
    }
    console.error("Insert failed:", error);
    throw error;
  }
}

export async function removeSelectedCourse(selectionId: string): Promise<void> {
  await apiClient.delete(`/user/selected-courses/${selectionId}/`);
}
export async function deleteSelectedCourseByCode(courseCode: string | number): Promise<void> {
  try {
    // 1. Get current selections
    const response = await apiClient.get('/user/selected-courses/');
    const list = response.data.data || response.data || [];

    // 2. Find the selection with matching code
    const selection = list.find((item: any) =>
      String(item.course_code) === String(courseCode)
    );

    if (!selection || !selection.id) {
      console.log(`No selection found for code ${courseCode} → already deselected`);
      return; // Idempotent: success
    }

    // 3. Delete using REAL selection ID
    console.log(`Deleting real selection ID: ${selection.id} for code ${courseCode}`);
    await apiClient.delete(`/user/selected-courses/${selection.id}/`);
    console.log(`DELETE success for ID: ${selection.id}`);
  } catch (err: any) {
    if (err.response?.status === 404) {
      console.log("404 → selection already gone");
      return;
    }
    console.error("Delete by code failed:", err);
    throw err;
  }
}
// New: Delete by name + institution (safe & idempotent)
export async function removeSelectedCourseByName(courseName: string, institution: string): Promise<void> {
  await apiClient.delete('/user/selected-courses/', {
    params: {
      course_name: courseName,
      institution: institution,
    },
  });
}
export async function fetchSelectedCourses(): Promise<Course[]> {
  try {
    const response = await apiClient.get('/user/selected-courses/');
    const list = response.data.data || response.data || [];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    if (!Array.isArray(list)) return [];

    return list.map((item: any) => ({
      id: item.id,                        // selection PK
      selectionId: item.id,               // for delete
      code: "N/A",                        // we don't have it — will enrich later
      name: item.course_name || "Unknown Course",
      university_name: item.institution || "Unknown",
      institution: item.institution || "Unknown",
      is_selected: true,
      is_applied: item.is_applied,
      application_date: item.application_date,
      created_at: item.created_at,
      // Flag to know we need enrichment
      _needsEnrichment: true,
      _sourceInstitution: item.institution,
    }));
  } catch (error) {
    console.error("Failed to fetch selected courses:", error);
    return [];
  }
}
export async function enrichSelectedCourse(selection: Course): Promise<Course> {
  if (!selection._needsEnrichment) return selection;

  const institution = selection._sourceInstitution?.toLowerCase() || "";

  try {
    // KMTC case
    if (institution.includes("kmtc") || institution === "KMTC") {
      const programmes = await fetchKMTCProgrammes();
      const match = programmes.find(p => 
        p.name.toLowerCase().includes(selection.name.toLowerCase()) ||
        p.name.toLowerCase() === selection.name.toLowerCase()
      );
    
      if (match) {
        return {
          ...selection,
          code: match.code || selection.code || "N/A",
          minimum_grade: match.minimum_grade || "N/A",
          duration_years: match.duration || "N/A",
          qualification: match.qualification || "Certificate/Diploma",
          description: match.description || "",
          _needsEnrichment: false,
        };
      }
    }

    // University case – search offerings by name (or code if you had it)
    const allOfferings = await fetchCourses();  // or filter by institution if endpoint supports
    const match = allOfferings.find(c => 
      c.name.toLowerCase() === selection.name.toLowerCase() ||
      c.name.toLowerCase().includes(selection.name.toLowerCase())
    );

    if (match) {
      return {
        ...selection,
        code: match.code || "N/A",
        minimum_grade: match.minimum_grade,
        duration_years: match.duration_years,
        tuition_fee_per_year: match.tuition_fee_per_year,
        career_prospects: match.career_prospects,
        qualification: match.category || selection.qualification,
        _needsEnrichment: false,
      };
    }

    // Fallback – at least show what we have
    return {
      ...selection,
      code: "N/A (lookup failed)",
      _needsEnrichment: false,
    };
  } catch (err) {
    console.error("Enrichment failed for:", selection.name, err);
    return {
      ...selection,
      code: "N/A (error)",
      _needsEnrichment: false,
    };
  }
}

export async function fetchKMTCProgrammes(): Promise<Programme[]> {
  try {
    const response = await apiClient.get('/kmtc/programmes');
    const list = getResponseData(response.data);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    if (!Array.isArray(list)) {
      console.warn('[fetchKMTCProgrammes] Expected array but got:', list);
      return [];
    }

    return list.map((prog: any) => ({
      id: prog.id.toString(),
      code: prog.code || "N/A",
      name: prog.name || "Unknown Programme",
      level: prog.level || "N/A",
      duration: prog.duration || "N/A",
      qualification: prog.qualification || "N/A",
      description: prog.description || "",
      department_name: prog.department_name || "General",
      faculty_name: prog.faculty_name || "N/A",
      offered_at: prog.offered_at || [], // array of { campus_name, city, campus_code, notes }
    }));
  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('[fetchKMTCProgrammes] Failed to fetch programmes:', errorDetails);
    return [];
  }
}
export async function fetchKMTCProgrammeByCode(code: string): Promise<Programme | null> {
  try {
    if (!code || typeof code !== "string") {
      console.warn("[fetchKMTCProgrammeByCode] Invalid code:", code);
      return null;
    }

    // CORRECT PATH — NO /eduhub prefix
    const response = await apiClient.get(`/kmtc/programmes/${code}`);

    const prog = response.data;
    for (let i = prog.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [prog[i], prog[j]] = [prog[j], prog[i]];
    }
    if (!prog || !prog.code) {
      console.warn("[fetchKMTCProgrammeByCode] Invalid data:", prog);
      return null;
    }

    return {
      id: prog.id?.toString() || "",
      code: prog.code,
      name: prog.name || "Unknown Programme",
      level: prog.level || "N/A",
      duration: prog.duration || "N/A",
      qualification: prog.qualification || "N/A",
      description: prog.description || "",
      department_name: prog.department_name || "General",
      faculty_name: prog.faculty_name || "N/A",
      offered_at: prog.offered_at || [],
    };
  } catch (error: any) {
    const details = extractErrorDetails(error);
    console.error("[fetchKMTCProgrammeByCode] Failed for code", code, ":", details);
    return null;
  }
}

// PAYMENT
export async function initiatePayment(amount: number, plan_id: number, phone_number: string) {
  try {
    const response = await apiClient.post<{
      status: string;
      message: string;
      data: any;
    }>('/payments/initiate/', { phone_number, amount,  plan_type: plan_id === 1 ? 'PREMIUM' : 'RENEWAL'});
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

export async function fetchKMTCCampuses(params = {}): Promise<KMTCCampus[]> {
  try {
    const response = await apiClient.get('/kmtc/campuses', { params });
    const list = getResponseData(response.data);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      code: c.code,
      city: c.city,
      description: c.description,
    }));
  } catch {
    return [];
  }
}

export async function fetchCoursesByKMTCCampus(campusCode: string): Promise<KMTCCourse[]> {
  try {
    if (!campusCode || typeof campusCode !== 'string') {
      console.warn('[fetchCoursesByKMTCCampus] Invalid or missing campusCode:', campusCode);
      return [];
    }

    // NEW BACKEND: Use the dedicated endpoint
    const response = await apiClient.get(`/kmtc/campuses/${campusCode}/programmes`);
    
    // Response is array of programmes with offered_at info
    const programmes = Array.isArray(response.data) ? response.data : [];

    // Get campus name for display
    let campusName = 'Unknown KMTC Campus';
    try {
      const campusResponse = await apiClient.get('/kmtc/campuses', { params: { code: campusCode } });
      const campuses = getResponseData(campusResponse.data);
      if (campuses.length > 0) {
        campusName = campuses[0].name || campusName;
      }
    } catch (err) {
      console.warn('[fetchCoursesByKMTCCampus] Could not fetch campus name:', err);
    }

    // Map to frontend KMTCCourse format
    const courses: KMTCCourse[] = programmes.map((prog: any) => ({
      id: prog.id.toString(),
      code: prog.code || 'UNKNOWN',
      name: prog.name,
      department: prog.department_name || 'General',
      level: prog.level || 'N/A',
      duration: prog.duration || 'N/A',
      qualification: prog.qualification || 'N/A',
      campus_code: campusCode,
      description: prog.description || 'No description available',
      campus_name: campusName,
    }));

    console.log(`[fetchCoursesByKMTCCampus] Loaded ${courses.length} courses for ${campusName}`);
    return courses;

  } catch (error: any) {
    const errorDetails = extractErrorDetails(error);
    console.error('[fetchCoursesByKMTCCampus] Failed to fetch courses for campus', campusCode, ':', errorDetails);
    return [];
  }
}

// CONTACT
export async function submitContactForm(data: ContactFormData): Promise<ContactFormResponse> {
  try {
    const response = await apiClient.post<ContactFormResponse>('/auth/contact/submit/', data);
    return response.data;
  } catch (error: any) {
    console.error('Contact form submission failed:', extractErrorDetails(error));
    throw extractErrorDetails(error);
  }
}

export default apiClient;