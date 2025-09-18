// frontend/types.ts
export interface SubjectGrades {
    subject: string;
    grade: string;
    code: string;
    label: string;
  }
  
export interface UserData {
    username: string;
    password: string;
    email?: string;
    phone_number?: string;
    // Add any other fields from your form
}
export interface Course {
  id: string;
  name: string;
  code?: string;
  university_name?: string; // Changed from University to string
  university_code?: string;
  category?: string;
  description?: string;
  duration_years?: number;
  minimum_grade?: string | number | undefined;
  career_prospects?: string;
  tuition_fee_per_year?: string;
  application_fee?: number;
  required_subjects?: Array<{ subject: { name: string } }>;
  average_rating?: number;
  total_reviews?: number;
  is_selected?: boolean;
  startDate?: string; // Optional, as it’s not in the API response
  applicationDeadline?: string; // Optional, as it’s not in the API response
  department?: string;
  faculty_id?: number;
  qualification?: string; // Added to manage qualification status
  selectionId?: string;
  is_applied?: boolean; // To track if the user has applied
  created_at?: string; // To track when the course was added to selections
  updated_at?: string; // To track when the course selection was last updated
}
export interface University {
  id: number | string; // Adjusted to string for consistency with Course.university_name
  name: string;
  slug: string | undefined; // From API response
  code?: string;
  logo: string | undefined; // From API response
  city: string | undefined; // From API response
  campus: string | undefined; // From API response
  faculties: Faculty[]; // List of faculties
  established_year:string;
  ranking?: number | null;
  available_courses?: number // Added via course count
  accreditation?: string // Not provided by API, fallback to "N/A"
  description?: string; // From API response
  is_applied?: boolean; // To track if the user has applied
  selectionId?: number | string; // To track the selection ID if needed
}
export type Faculty = {
  id: number;
  name: string;
  university_id?: number; // Optional, as not provided in API
  slug?: string; // From API response
  description?: string; // From API response
  courseCount?: number;
  departments: Department[];
}
export type Department = {
  id: number
  name: string
  faculty_id: number
  courseCount?: number // To be fetched
  courses?: Course[] // Optional, for course names
  slug?: string; // From API response
  description?: string;
}
export interface Subject {
  value: string;
  label: string;
  code: string;
  id: string; // Assuming each subject has a unique ID
  name: string; // Assuming each subject has a name
}
interface User {
  id: string
  email: string
  name: string
  first_name: string
  last_name: string
  phone_number: string
  is_premium: boolean
  // Add other fields from your UserDetailSerializer
}
interface Tokens {
  access: string
  refresh: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  tokens: Tokens | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  register: (data: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone_number: string
  }) => Promise<void>
  refreshToken: () => Promise<boolean>
}
export interface KMTCCampus {
  id: number;
  name: string;
  slug: string;
  code: string;
  city: string;
  description: string;
}
export interface KMTCCourse {
  id: string;
  code: string;
  name: string;
  department: string;
  required_grade: string;
  qualification: string;
  campus_code: string;
  description: string;
  campus_name: string;
}
export interface LoginResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: {
    user: User;
    tokens?: { access: string; refresh: string };
  };
  errors: {
    phone_number?: string[];
    password?: string[];
    non_field_errors?: string[];
    [key: string]: string[] | undefined;
  };

}
export interface SelectedCourseResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: Array<{
    id: string;
    course: {
      id: string;
      name: string;
      university_name?: string;
      code?: string;
      university_code?: string;
      category?: string;
      description?: string;
      duration_years?: number;
      minimum_grade?: string | number;
      career_prospects?: string;
      tuition_fee_per_year?: number;
      start_date?: string;
      application_deadline?: string;
      delivery_mode?: string;
      department?: string;
      level?: string;
      qualification?: string;
      application_fee?: number;
      average_rating?: number;
      total_reviews?: number;
      is_selected?: boolean;
    };
    is_applied: boolean;
    application_date: string | null;
    created_at: string;
  }> | {
    id: string;
    course: {
      id: string;
      name: string;
      university_name?: string;
      code?: string;
      university_code?: string;
      category?: string;
      description?: string;
      duration_years?: number;
      minimum_grade?: string | number;
      career_prospects?: string;
      tuition_fee_per_year?: number;
      start_date?: string;
      application_deadline?: string;
      delivery_mode?: string;
      department?: string;
      level?: string;
      qualification?: string;
      application_fee?: number;
      average_rating?: number;
      total_reviews?: number;
      is_selected?: boolean;
    };
    is_applied: boolean;
    application_date: string | null;
    created_at: string;
  } | null;
  errors?: Record<string, any>;
  meta?: Record<string, any>;
}
export interface SelectedUniversityResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: {
    id: string;
    university: {
      id: string;
      name: string;
      slug: string;
      logo?: string;
      city?: string;
      campus?: string;
      description?: string;
      created_at?: string;
      faculties?: Faculty[];
      established_year?:string;
    };
    is_applied: boolean;
    application_date: string | null;
    created_at: string;
  } | null;
  errors?: Record<string, any>;
  meta?: Record<string, any>;
}