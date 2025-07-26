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
  code: string;
  university_name: string; // Changed from University to string
  university_code: string;
  category: string;
  description: string;
  duration_years: string;
  minimum_grade: string;
  career_prospects: string;
  tuition_fee_per_year: string;
  application_fee: string;
  required_subjects: Array<{ subject: { name: string } }>;
  average_rating: number;
  total_reviews: number;
  is_selected: boolean;
  startDate?: string; // Optional, as it’s not in the API response
  applicationDeadline?: string; // Optional, as it’s not in the API response
  department?: string;
  faculty_id?: number;
  qualification?: string; // Added to manage qualification status
  selectionId?: number |string;
}
export interface University {
  id: number;
  name: string;
  slug: string;
  code: string;
  logo: string;
  city: string;
  campus: string;
  faculties: Faculty[]; // List of faculties
  established_year:string;
  ranking: number | null;
  available_courses?: number // Added via course count
  accreditation?: string // Not provided by API, fallback to "N/A"
}
export type Faculty = {
  id: number
  name: string
  university_id: number
  courseCount?: number // To be fetched
}
export type Department = {
  id: number
  name: string
  faculty_id: number
  courseCount?: number // To be fetched
  courses?: Course[] // Optional, for course names
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
  phone_number?: string
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
