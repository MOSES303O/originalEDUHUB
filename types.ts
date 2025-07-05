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
}
export interface University {
  id: number;
  name: string;
  slug: string;
  code: string;
  logo: string;
  city: string;
  campus: string;
  ranking: number | null;
}