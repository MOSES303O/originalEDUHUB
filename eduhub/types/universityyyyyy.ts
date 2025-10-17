export interface University {
    id: number
    name: string
    slug: string
    code: string
    logo: string | null
    city: string
    campus: string
    ranking: number | null
  }
  
  export interface Course {
    id: string
    name: string
    universityId: number
    universityName: string
    requiredPoints: string
    qualification: string
    department: string
    faculty: string
    description?: string
  }
  
  export interface UniversityWithCourses extends University {
    courseCount: number
    departments: Array<{
      name: string
      courseCount: number
      courses: Course[]
    }>
    faculties: Array<{
      name: string
      courseCount: number
      departments: string[]
    }>
    establishedYear: number
    accreditation: string
  }
  