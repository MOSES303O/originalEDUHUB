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
  id?: string;
  name: string;
  code: string | number;
  university_name?: string ; // Changed from University to string
  university_code?: string;
  category?: string;
  institution?: string;
  description?: string;
  
  details?: string;
  cluster_requirements?:string;
  program?:{
    id?: string;
    name?: string;
    required_subjects?: Array<{ subject: { name?: string }; minimum_grade?: string; is_mandatory?: boolean; cluster_requirements?: string }>;
    category?: string;
    typical_duration_years?: string | number;
    details?: string;
  }
  type?: string;
  _sourceInstitution?: string;
  _needsEnrichment?: boolean;
  duration_years?: string | number | undefined;
  university?:{
    id: number | string;
    name: string;
    slug: string;
    code?: string;
    logo?: string | null;
    city?: string;
    campus?: string;
    ranking?: number | null;
    accreditation?: string;
  }
  universityId?: number | string; // Optional for compatibility
  minimum_grade?: string | number | undefined;
  career_prospects?: string;
  tuition_fee_per_year?: number;
  application_fee?: number;
  required_subjects?: Array<{ subject: { name: string } }>;
  average_rating?: number;
  total_reviews?: number;
  is_selected?: boolean;
  startDate?: string; // Optional, as it’s not in the API response
  applicationDeadline?: string; // Optional, as it’s not in the API response
  department?: string;
  faculty_id?: string | number;
  qualification?: string; // Added to manage qualification status
  selectionId?: string;
  is_kmtc_course?: boolean; // Flag to identify KMTC courses
  level?: string; // KMTC course level
  intake_months?: string[]; // KMTC intake months
  user_application?: {
    id: string;
    status: string;
    application_number: string;
    submitted_at: string | null;
  } | null;
  is_applied?: boolean; // To track if the user has applied
  created_at?: string; // To track when the course was added to selections
  updated_at?: string; // To track when the course selection was last updated
}
export interface University {
  id: number | string; // Matches the API response
  name: string; // Matches the API response
  slug: string | undefined; // Matches the API response
  code?: string; // Matches the API response
  logo?: string | null; // Updated to match the API response (null is allowed)
  city?: string; // Matches the API response
  campus?: string; // Matches the API response
  faculties?:Array<{
    name: string;
    courseCount: number;
    departments: string[];
    id?: number | string;
    university_id?: number;
    slug?: string;
    description?: string;
  }>;
  established_year?: string; // Optional, as it is not in the API response
  ranking?: number | null; // Matches the API response
  courses_count?: string | number; // Optional, as it is not in the API response
  accreditation?: string; // Matches the API response
  description?: string; // Optional, as it is not in the API response
}
export interface UniversityWithCourses extends University {
  courseCount: number;
  type?: string;
  departments: Array<{
    name: string;
    courseCount: number;
    courses: Course[];
    id?: number | string;
    faculty_id?: number;
    slug?: string | undefined;
    description?: string;
  }>;
  faculties: Array<{
    name: string;
    courseCount: number;
    departments: string[];
    id?: number | string;
    university_id?: number;
    slug?: string | undefined;
    description?: string;
  }>;
  description?: string;
  establishedYear: string;
  accreditation: string;
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
export interface OfferedAt {
  campus_name: string;
  city: string;
  campus_code: string;
  notes?: string;
}

export interface Programme {
  id: string;
  code: string;
  name: string;
  level: string;
  duration_years?: string | number | undefined;
  minimum_grade?: string | number;
  duration: string;
  qualification: string;
  description: string;
  department_name: string;
  faculty_name: string;
  offered_at: OfferedAt[];
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
  description?: string;
  programmes_count?: number;
}
export interface KMTCCourse {
  id: string;
  code: string;
  name: string;
  level?: string;
  department: string;
  required_grade?: string;
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
// types/index.ts or wherever you define it
export interface SelectedCourseItem {
  id: string;
  course: {
    id: string;
    name: string;
    code?: string;
    university_name?: string;
    university_code?: string;
    category?: string;
    description?: string;
    duration_years?: number;
    minimum_grade?: string | number;
    tuition_fee_per_year?: number;
    application_fee?: number;
    average_rating?: number;
    total_reviews?: number;
    is_selected?: boolean;
    // add any other course fields you use
  };
  is_applied: boolean;
  application_date: string | null;
  created_at: string;
}

export interface SelectedCourseResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: SelectedCourseItem[] | SelectedCourseItem | null;
  errors?: Record<string, any>;
}
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactFormResponse {
  received: boolean;
}

export interface CourseSubjectRequirement {
  subject?: Subject | null;
  subject_id?: string | null;
  minimum_grade?: string;
  is_mandatory?: boolean;
  cluster_requirements?: string; // KUUCPS-style cluster text
}
export interface RecommendedCourse extends Course {
  qualified: boolean;
  qualification_details: {
    user_points?: number;
    required_points?: number;
    points_source?: 'stored' | 'calculated';
    subjects_count?: number;
    reason?: string;
    missing_mandatory?: Array<{ subject: string; required_grade: string }>;
    unmet_grades?: Array<{ subject: string; user_grade: string; required_grade: string }>;
    message?: string;
    [key: string]: any;
  };
  user_points?: number;
  required_points?: number;
  points_source?: string;
  cluster?: number;
  match_score?: number;
}