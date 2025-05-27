"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface SubjectGradeFormProps {
  onClose: () => void
}

type Subject = {
  id: string
  name: string
  grade: string
}

export function SubjectGradeForm({ onClose }: SubjectGradeFormProps) {
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: "1", name: "", grade: "" },
    { id: "2", name: "", grade: "" },
    { id: "3", name: "", grade: "" },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubjectChange = (id: string, field: "name" | "grade", value: string) => {
    setSubjects(subjects.map((subject) => (subject.id === id ? { ...subject, [field]: value } : subject)))
  }

  const addSubject = () => {
    setSubjects([...subjects, { id: `${subjects.length + 1}`, name: "", grade: "" }])
  }

  const removeSubject = (id: string) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((subject) => subject.id !== id))
    }
  }

  const calculatePoints = () => {
    // Simple point calculation based on grades
    const gradePoints = {
      A: 12,
      "A-": 11,
      "B+": 10,
      B: 9,
      "B-": 8,
      "C+": 7,
      C: 6,
      "C-": 5,
      "D+": 4,
      D: 3,
      "D-": 2,
      E: 1,
    }

    let totalPoints = 0
    let validSubjects = 0

    subjects.forEach((subject) => {
      if (subject.name && subject.grade && gradePoints[subject.grade as keyof typeof gradePoints]) {
        totalPoints += gradePoints[subject.grade as keyof typeof gradePoints]
        validSubjects++
      }
    })

    // Return average points multiplied by a factor to get a reasonable range
    return validSubjects > 0 ? Math.round(totalPoints * 3) : 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Calculate total points
    const totalPoints = calculatePoints()

    // Store subject data and points in localStorage
    const subjectData = {
      subjects: subjects.filter((s) => s.name && s.grade),
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

    // Simulate API call delay
    setTimeout(() => {
      setIsSubmitting(false)

      // Redirect to courses page with the calculated points
      const subjectParams = subjects
        .filter((s) => s.name && s.grade)
        .map((s) => `subjects=${encodeURIComponent(`${s.name}:${s.grade}`)}`)
        .join("&")

      router.push(`/courses?points=${totalPoints}&${subjectParams}`)
    }, 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Enter Your Subject Grades</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <CardDescription>
            Tell us about your high school subjects and grades to get personalized course recommendations.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              {subjects.map((subject, index) => (
                <div key={subject.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
                  <div className="space-y-2">
                    <Label htmlFor={`subject-${subject.id}`}>Subject {index + 1}</Label>
                    <Select
                      value={subject.name}
                      onValueChange={(value) => handleSubjectChange(subject.id, "name", value)}
                    >
                      <SelectTrigger id={`subject-${subject.id}`}>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Kiswahili">Kiswahili</SelectItem>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Biology">Biology</SelectItem>
                        <SelectItem value="Geography">Geography</SelectItem>
                        <SelectItem value="History">History</SelectItem>
                        <SelectItem value="Business Studies">Business Studies</SelectItem>
                        <SelectItem value="Computer Studies">Computer Studies</SelectItem>
                        <SelectItem value="Agriculture">Agriculture</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`grade-${subject.id}`}>Grade</Label>
                    <Select
                      value={subject.grade}
                      onValueChange={(value) => handleSubjectChange(subject.id, "grade", value)}
                    >
                      <SelectTrigger id={`grade-${subject.id}`} className="w-[100px]">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="C+">C+</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="C-">C-</SelectItem>
                        <SelectItem value="D+">D+</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="D-">D-</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSubject(subject.id)}
                    disabled={subjects.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addSubject}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Find Matching Courses"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
