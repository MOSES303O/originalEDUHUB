"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, ChevronDown, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { fetchSubjects } from "@/lib/api"

interface FindCourseFormProps {
  onClose: () => void
}

type Subject = {
  id: string
  value: string
  label: string
  grade: string
}

// Grades with their point values
const grades = [
  { value: "A", label: "A", points: 12 },
  { value: "A-", label: "A-", points: 11 },
  { value: "B+", label: "B+", points: 10 },
  { value: "B", label: "B", points: 9 },
  { value: "B-", label: "B-", points: 8 },
  { value: "C+", label: "C+", points: 7 },
  { value: "C", label: "C", points: 6 },
  { value: "C-", label: "C-", points: 5 },
  { value: "D+", label: "D+", points: 4 },
  { value: "D", label: "D", points: 3 },
  { value: "D-", label: "D-", points: 2 },
  { value: "E", label: "E", points: 1 },
]

export function FindCourseForm({ onClose }: FindCourseFormProps) {
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ value: string; label: string }>>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([])
  const [isSubjectsDropdownOpen, setIsSubjectsDropdownOpen] = useState(false)
  const [totalPoints, setTotalPoints] = useState(0)
  const [error, setError] = useState<string | null>(null)
  //const [loading, setLoading] = useState(true)
  const router = useRouter()
    const MIN_SUBJECTS = 7;
    const MAX_SUBJECTS = 9;
  
    useEffect(() => {
      async function loadSubjects() {
        try {
          const data = await fetchSubjects();
          setAvailableSubjects(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
          console.error("Error loading subjects:", err);
          setAvailableSubjects([
            { value: "mathematics", label: "Mathematics" },
            { value: "kiswahili", label: "Kiswahili" },
            { value: "english", label: "English" },
            { value: "biology", label: "Biology" },
            { value: "chemistry", label: "Chemistry" },
            { value: "physics", label: "Physics" },
            { value: "history", label: "History" },
            { value: "geography", label: "Geography" },
            { value: "business_studies", label: "Business Studies" },
            { value: "computer_studies", label: "Computer Studies" },
            { value: "agriculture", label: "Agriculture" },
            { value: "home_science", label: "Home Science" },
            { value: "art_design", label: "Art & Design" },
            { value: "music", label: "Music" },
            { value: "religious_education", label: "Religious Education" },
          ]);
        }
      }
  
      loadSubjects();
    }, []);

  useEffect(() => {
    // Calculate total points whenever subject grades change
    const points = selectedSubjects.reduce((total, subject) => {
      const gradeInfo = grades.find((g) => g.value === subject.grade)
      return total + (gradeInfo?.points || 0)
    }, 0)
    setTotalPoints(points)

    // Set error message based on subject count
    if (selectedSubjects.length < MIN_SUBJECTS) {
      setError(`Please select at least ${MIN_SUBJECTS} subjects (${selectedSubjects.length}/${MIN_SUBJECTS} selected)`)
    } else {
      // Check if all selected subjects have grades
      const missingGrades = selectedSubjects.filter((subject) => !subject.grade)
      if (missingGrades.length > 0) {
        setError(`Please select grades for all subjects (${missingGrades.length} missing)`)
      } else {
        setError(null)
      }
    }
  }, [selectedSubjects])

  const handleSubjectSelect = (subject: { value: string; label: string }) => {
    if (selectedSubjects.length < MAX_SUBJECTS && !selectedSubjects.some((s) => s.value === subject.value)) {
      setSelectedSubjects([...selectedSubjects, { ...subject, id: Date.now().toString(), grade: "" }])
    }
    setIsSubjectsDropdownOpen(false)
  }

  const handleRemoveSubject = (id: string) => {
    setSelectedSubjects(selectedSubjects.filter((subject) => subject.id !== id))
  }

  const handleGradeChange = (id: string, grade: string) => {
    setSelectedSubjects(selectedSubjects.map((subject) => (subject.id === id ? { ...subject, grade } : subject)))
  }

  const handleSubmit = () => {
    if (selectedSubjects.length < MIN_SUBJECTS) {
      return
    }

    // Check if all subjects have grades
    const missingGrades = selectedSubjects.filter((subject) => !subject.grade)
    if (missingGrades.length > 0) {
      return
    }

    // Store subject data and points in localStorage
    const subjectData = {
      subjects: selectedSubjects.map((s) => ({ name: s.label, grade: s.grade })),
      totalPoints,
    }
    localStorage.setItem("eduPathwaySubjects", JSON.stringify(subjectData))

    // Create a user record to simulate account creation
    localStorage.setItem(
      "eduPathwayUser",
      JSON.stringify({
        id: `user-${Date.now()}`,
        hasCompletedProfile: true,
        hasPaid: false,
      }),
    )

    // Build query parameters
    const queryParams = new URLSearchParams()
    selectedSubjects.forEach((s) => {
      queryParams.append("subjects", `${s.label}:${s.grade}`)
    })
    queryParams.append("points", totalPoints.toString())

    // Navigate to courses page
    router.push(`/courses?${queryParams.toString()}`)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/70 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#111827] text-white rounded-lg my-4">
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Find Your Course</h2>
              <p className="text-gray-400">
                Select your high school subjects to discover university courses that match your interests and strengths
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-gray-700">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm">
              Select your high school subjects ({MIN_SUBJECTS}-{MAX_SUBJECTS})
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Total Points:</span>
              <span className="bg-gray-700 px-3 py-1 rounded-md">{totalPoints}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {/* Subject selection dropdown */}
          <div className="relative">
            <button
              type="button"
              className="w-full flex items-center justify-between bg-gray-800 border border-gray-700 rounded-md px-4 py-2"
              onClick={() => setIsSubjectsDropdownOpen(!isSubjectsDropdownOpen)}
              disabled={selectedSubjects.length >= MAX_SUBJECTS}
            >
              <span>
                {selectedSubjects.length >= MAX_SUBJECTS
                  ? `Maximum ${MAX_SUBJECTS} subjects selected`
                  : "Select subjects..."}
              </span>
              <ChevronDown className="h-5 w-5" />
            </button>

            {isSubjectsDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                {availableSubjects
                  .filter((subject) => !selectedSubjects.some((s) => s.value === subject.value))
                  .map((subject) => (
                    <div
                      key={subject.value}
                      className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleSubjectSelect(subject)}
                    >
                      {subject.label}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Selected subjects with grades */}
          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
            {selectedSubjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-md p-2 flex-shrink-0"
              >
                <div className="bg-gray-900 px-3 py-1 rounded-md">{subject.label}</div>

                <div className="relative">
                  <select
                    value={subject.grade}
                    onChange={(e) => handleGradeChange(subject.id, e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1 pr-8 appearance-none"
                  >
                    <option value="">Grade</option>
                    {grades.map((grade) => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSubject(subject.id)}
                  className="bg-gray-700 hover:bg-gray-600 rounded-full p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-400">
            {selectedSubjects.length > 0 ? (
              <div className="flex items-center justify-between">
                <span>{selectedSubjects.length} subjects selected</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            ) : null}
          </div>

          <div className="text-sm text-gray-400">
            Select between {MIN_SUBJECTS} and {MAX_SUBJECTS} subjects that you have studied in high school and assign
            grades to each.
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!!error}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-md"
          >
            Find Courses
          </Button>
        </div>
      </div>
    </div>
  );
}
