import type { University, Course, UniversityWithCourses } from "@/types/university"

// Your existing API response data
export const universitiesData: University[] = [
  {
    id: 2,
    name: "KENYATTA UNIVERSITY",
    slug: "kenyatta-university",
    code: "KU01",
    logo: "http://127.0.0.1:8000/media/universities/logos/_DSC0019.jpg",
    city: "THIKA",
    campus: "thika campus",
    ranking: null,
  },
  {
    id: 3,
    name: "MASENO UNIVERSITY",
    slug: "maseno-university",
    code: "MASENO001",
    logo: "http://127.0.0.1:8000/media/universities/logos/_DSC0021_e2zbnFW.jpg",
    city: "kisumu",
    campus: "city campus",
    ranking: null,
  },
  {
    id: 1,
    name: "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY",
    slug: "MMUST",
    code: "MMUST",
    logo: null,
    city: "KAKAMEGA",
    campus: "kakamega campus",
    ranking: null,
  },
]

// Mock courses data
export const coursesData: Course[] = [
  // Kenyatta University Courses
  {
    id: "CSS001",
    name: "COMPUTER SCIENCE",
    universityId: 2,
    universityName: "KENYATTA UNIVERSITY",
    requiredPoints: "B",
    qualification: "B",
    department: "Computer Science",
    faculty: "Science & Technology",
  },
  {
    id: "ENG001",
    name: "SOFTWARE ENGINEERING",
    universityId: 2,
    universityName: "KENYATTA UNIVERSITY",
    requiredPoints: "B+",
    qualification: "B",
    department: "Computer Science",
    faculty: "Science & Technology",
  },
  {
    id: "MED001",
    name: "MEDICINE AND SURGERY",
    universityId: 2,
    universityName: "KENYATTA UNIVERSITY",
    requiredPoints: "A",
    qualification: "B",
    department: "Medicine",
    faculty: "Health Sciences",
  },
  {
    id: "BUS001",
    name: "BUSINESS ADMINISTRATION",
    universityId: 2,
    universityName: "KENYATTA UNIVERSITY",
    requiredPoints: "B-",
    qualification: "B-",
    department: "Business Studies",
    faculty: "Business & Economics",
  },
  {
    id: "EDU001",
    name: "PRIMARY EDUCATION",
    universityId: 2,
    universityName: "KENYATTA UNIVERSITY",
    requiredPoints: "C+",
    qualification: "B",
    department: "Education",
    faculty: "Education & Human Sciences",
  },
  {
    id: "ENG002",
    name: "CIVIL ENGINEERING",
    universityId: 2,
    universityName: "KENYATTA UNIVERSITY",
    requiredPoints: "B+",
    qualification: "B",
    department: "Engineering",
    faculty: "Science & Technology",
  },

  // Maseno University Courses
  {
    id: "TMC001",
    name: "MATHEMATICS AND COMPUTER SCIENCE",
    universityId: 3,
    universityName: "MASENO UNIVERSITY",
    requiredPoints: "B-",
    qualification: "B-",
    department: "Science",
    faculty: "Science",
  },
  {
    id: "AGR001",
    name: "AGRICULTURAL ECONOMICS",
    universityId: 3,
    universityName: "MASENO UNIVERSITY",
    requiredPoints: "C+",
    qualification: "B",
    department: "Agriculture",
    faculty: "Agriculture & Natural Resources",
  },
  {
    id: "EDU002",
    name: "EDUCATIONAL PSYCHOLOGY",
    universityId: 3,
    universityName: "MASENO UNIVERSITY",
    requiredPoints: "B-",
    qualification: "B",
    department: "Education",
    faculty: "Education",
  },
  {
    id: "ART001",
    name: "LITERATURE",
    universityId: 3,
    universityName: "MASENO UNIVERSITY",
    requiredPoints: "C+",
    qualification: "B",
    department: "Arts & Social Sciences",
    faculty: "Arts & Social Sciences",
  },
  {
    id: "BUS002",
    name: "DEVELOPMENT STUDIES",
    universityId: 3,
    universityName: "MASENO UNIVERSITY",
    requiredPoints: "B-",
    qualification: "B",
    department: "Business & Economics",
    faculty: "Arts & Social Sciences",
  },

  // MMUST Courses
  {
    id: "ENG003",
    name: "MECHANICAL ENGINEERING",
    universityId: 1,
    universityName: "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY",
    requiredPoints: "B+",
    qualification: "B",
    department: "Engineering",
    faculty: "Engineering",
  },
  {
    id: "CSS002",
    name: "INFORMATION TECHNOLOGY",
    universityId: 1,
    universityName: "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY",
    requiredPoints: "B",
    qualification: "B",
    department: "Computer Science & IT",
    faculty: "Computing & Informatics",
  },
  {
    id: "AGR002",
    name: "AGRICULTURAL ENGINEERING",
    universityId: 1,
    universityName: "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY",
    requiredPoints: "B",
    qualification: "B",
    department: "Agriculture",
    faculty: "Agriculture",
  },
  {
    id: "EDU003",
    name: "SCIENCE EDUCATION",
    universityId: 1,
    universityName: "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY",
    requiredPoints: "B-",
    qualification: "B",
    department: "Education",
    faculty: "Education & Human Sciences",
  },
  {
    id: "BUS003",
    name: "PROJECT MANAGEMENT",
    universityId: 1,
    universityName: "MASINDE MULIRO UNIVERSITY OF SCIENCE & TECHNOLOGY",
    requiredPoints: "B-",
    qualification: "B",
    department: "Business Studies",
    faculty: "Education & Human Sciences",
  },
]

// Enhanced university data
const enhancedUniversityData = {
  2: {
    courseCount: 156,
    establishedYear: 1985,
    accreditation: "Accredited",
    departments: [
      {
        name: "Computer Science",
        courseCount: 12,
        courses: coursesData.filter((c) => c.universityId === 2 && c.department === "Computer Science"),
      },
      {
        name: "Engineering",
        courseCount: 18,
        courses: coursesData.filter((c) => c.universityId === 2 && c.department === "Engineering"),
      },
      {
        name: "Business Studies",
        courseCount: 15,
        courses: coursesData.filter((c) => c.universityId === 2 && c.department === "Business Studies"),
      },
      {
        name: "Medicine",
        courseCount: 8,
        courses: coursesData.filter((c) => c.universityId === 2 && c.department === "Medicine"),
      },
      {
        name: "Education",
        courseCount: 22,
        courses: coursesData.filter((c) => c.universityId === 2 && c.department === "Education"),
      },
    ],
    faculties: [
      {
        name: "Science & Technology",
        courseCount: 45,
        departments: ["Computer Science", "Engineering", "Mathematics", "Physics"],
      },
      {
        name: "Business & Economics",
        courseCount: 28,
        departments: ["Business Studies", "Economics", "Accounting"],
      },
      {
        name: "Health Sciences",
        courseCount: 18,
        departments: ["Medicine", "Nursing", "Pharmacy"],
      },
      {
        name: "Education & Human Sciences",
        courseCount: 35,
        departments: ["Education", "Psychology", "Social Work"],
      },
    ],
  },
  3: {
    courseCount: 89,
    establishedYear: 1991,
    accreditation: "Accredited",
    departments: [
      {
        name: "Agriculture",
        courseCount: 14,
        courses: coursesData.filter((c) => c.universityId === 3 && c.department === "Agriculture"),
      },
      {
        name: "Education",
        courseCount: 18,
        courses: coursesData.filter((c) => c.universityId === 3 && c.department === "Education"),
      },
      {
        name: "Arts & Social Sciences",
        courseCount: 20,
        courses: coursesData.filter((c) => c.universityId === 3 && c.department === "Arts & Social Sciences"),
      },
      {
        name: "Science",
        courseCount: 16,
        courses: coursesData.filter((c) => c.universityId === 3 && c.department === "Science"),
      },
      {
        name: "Business & Economics",
        courseCount: 12,
        courses: coursesData.filter((c) => c.universityId === 3 && c.department === "Business & Economics"),
      },
    ],
    faculties: [
      {
        name: "Agriculture & Natural Resources",
        courseCount: 25,
        departments: ["Agriculture", "Environmental Science", "Forestry"],
      },
      {
        name: "Education",
        courseCount: 22,
        departments: ["Education", "Educational Psychology"],
      },
      {
        name: "Arts & Social Sciences",
        courseCount: 28,
        departments: ["Arts & Social Sciences", "Languages"],
      },
      {
        name: "Science",
        courseCount: 14,
        departments: ["Science", "Mathematics"],
      },
    ],
  },
  1: {
    courseCount: 134,
    establishedYear: 1972,
    accreditation: "Accredited",
    departments: [
      {
        name: "Engineering",
        courseCount: 24,
        courses: coursesData.filter((c) => c.universityId === 1 && c.department === "Engineering"),
      },
      {
        name: "Computer Science & IT",
        courseCount: 16,
        courses: coursesData.filter((c) => c.universityId === 1 && c.department === "Computer Science & IT"),
      },
      {
        name: "Agriculture",
        courseCount: 18,
        courses: coursesData.filter((c) => c.universityId === 1 && c.department === "Agriculture"),
      },
      {
        name: "Education",
        courseCount: 20,
        courses: coursesData.filter((c) => c.universityId === 1 && c.department === "Education"),
      },
      {
        name: "Business Studies",
        courseCount: 14,
        courses: coursesData.filter((c) => c.universityId === 1 && c.department === "Business Studies"),
      },
    ],
    faculties: [
      {
        name: "Engineering",
        courseCount: 35,
        departments: ["Engineering", "Applied Sciences"],
      },
      {
        name: "Computing & Informatics",
        courseCount: 20,
        departments: ["Computer Science & IT", "Information Systems"],
      },
      {
        name: "Agriculture",
        courseCount: 25,
        departments: ["Agriculture", "Food Science"],
      },
      {
        name: "Education & Human Sciences",
        courseCount: 28,
        departments: ["Education", "Psychology"],
      },
    ],
  },
}

export function enrichUniversityData(universities: University[]): UniversityWithCourses[] {
  return universities.map((university) => ({
    ...university,
    ...enhancedUniversityData[university.id as keyof typeof enhancedUniversityData],
  }))
}
