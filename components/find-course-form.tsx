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
  code: string
  label: string
  grade: string
}

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
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; code: string; label: string }>>([])
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([])
  const [isSubjectsDropdownOpen, setIsSubjectsDropdownOpen] = useState(false)
  const [totalPoints, setTotalPoints] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const MIN_SUBJECTS = 7
  const MAX_SUBJECTS = 9

  useEffect(() => {
    async function loadSubjects() {
      const rawSubjects = await fetchSubjects();
      const normalizedSubjects = rawSubjects.map((s: any) => ({
        id: s.value, // Use value as the unique identifier or s.code
        code: s.value,
        label: s.label,
      }));
      setAvailableSubjects(normalizedSubjects);
    }
    loadSubjects();
  }, []);
  useEffect(() => {
    const points = selectedSubjects.reduce((total, subject) => {
      const gradeInfo = grades.find((g) => g.value === subject.grade)
      return total + (gradeInfo?.points || 0)
    }, 0)
    setTotalPoints(points)

    if (selectedSubjects.length < MIN_SUBJECTS) {
      setError(`Please select at least ${MIN_SUBJECTS} subjects (${selectedSubjects.length}/${MIN_SUBJECTS} selected)`)
    } else {
      const missingGrades = selectedSubjects.filter((s) => !s.grade)
      if (missingGrades.length > 0) {
        setError(`Please select grades for all subjects (${missingGrades.length} missing)`)
      } else {
        setError(null)
      }
    }
  }, [selectedSubjects])

  const handleSubjectSelect = (subject: { id: string; code: string; label: string }) => {
    if (
      selectedSubjects.length < MAX_SUBJECTS &&
      !selectedSubjects.some((s) => s.code === subject.code)
    ) {
      setSelectedSubjects([...selectedSubjects, { ...subject, grade: "" }]);
    }
    setIsSubjectsDropdownOpen(false);
  };

  const handleRemoveSubject = (id: string) => {
    setSelectedSubjects(selectedSubjects.filter((s) => s.id !== id))
  }

  const handleGradeChange = (id: string, grade: string) => {
    setSelectedSubjects(selectedSubjects.map((s) => (s.id === id ? { ...s, grade } : s)))
  }

  const handleSubmit = () => {
    if (error) return

    const subjectData = {
      subjects: selectedSubjects.map((s) => ({ name: s.label, grade: s.grade })),
      totalPoints,
    }

    localStorage.setItem("eduPathwaySubjects", JSON.stringify(subjectData))
    localStorage.setItem(
      "EduHubwayUser",
      JSON.stringify({ id: `user-${Date.now()}`, hasCompletedProfile: true, hasPaid: false })
    )

    const queryParams = new URLSearchParams()
    selectedSubjects.forEach((s) => {
      queryParams.append("subjects", `${s.label}:${s.grade}`)
    })
    queryParams.append("points", totalPoints.toString())

    router.push(`/courses?${queryParams.toString()}`)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/70 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#1a2521] text-white rounded-lg my-4">
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

          <div className="flex justify-between items-center text-sm">
            <span>Select your high school subjects ({MIN_SUBJECTS}-{MAX_SUBJECTS})</span>
            <div className="flex items-center gap-2">
              <span>Total Points:</span>
              <span className="bg-gray-700 px-3 py-1 rounded-md">{totalPoints}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {/* Subject dropdown */}
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
                  .filter((subject) => !selectedSubjects.some((s) => s.id === subject.id))
                  .map((subject) => (
                    <div
                      key={subject.id}
                      className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleSubjectSelect(subject)}
                    >
                      {subject.label}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Selected subjects */}
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
            Select between {MIN_SUBJECTS} and {MAX_SUBJECTS} subjects you studied in high school and assign grades to each.
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
  )
}
