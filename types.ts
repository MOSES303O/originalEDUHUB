// frontend/types.ts
export interface SubjectGrades {
    subject: string;
    grade: string;
  }
  
  export interface UserData {
    username: string;
    password: string;
    email?: string;
    phone_number?: string;
    // Add any other fields from your form
  }
  
  export interface Course {
    id: number;
    name: string;
    title: string;
    description: string;
  }
  