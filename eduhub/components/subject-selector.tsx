"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { fetchSubjects } from "@/lib/api"

interface SubjectSelectorProps {
  onSubmit: (subjects: string[]) => void
  initialSubjects?: string[]
  onError?: (error: string) => void
}

export function SubjectSelector({ onSubmit, initialSubjects = [], onError }: SubjectSelectorProps) {
  const [subjects, setSubjects] = useState<{ id: number; value: string; label: string }[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialSubjects)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSubjects() {
      try {
        setIsLoading(true)
        const data = await fetchSubjects()

        // If data is empty or not an array, use fallback data
        if (!Array.isArray(data) || data.length === 0) {
          const fallbackData = [
            { id: 1, value: "mathematics", label: "Mathematics" },
            { id: 2, value: "kiswahili", label: "Kiswahili" },
            { id: 3, value: "english", label: "English" },
            { id: 4, value: "biology", label: "Biology" },
            { id: 5, value: "chemistry", label: "Chemistry" },
            { id: 6, value: "physics", label: "Physics" },
            { id: 7, value: "history", label: "History" },
            { id: 8, value: "geography", label: "Geography" },
            { id: 9, value: "business_studies", label: "Business Studies" },
            { id: 10, value: "computer_studies", label: "Computer Studies" },
          ]
          setSubjects(fallbackData)
        } else {
          setSubjects(data)
        }
      } catch (err) {
        console.error("Error loading subjects:", err)
        setError("Failed to load subjects. Please try again.")
        if (onError) onError("Failed to load subjects. Please try again.")

        // Use fallback data
        const fallbackData = [
          { id: 1, value: "mathematics", label: "Mathematics" },
          { id: 2, value: "kiswahili", label: "Kiswahili" },
          { id: 3, value: "english", label: "English" },
          { id: 4, value: "biology", label: "Biology" },
          { id: 5, value: "chemistry", label: "Chemistry" },
          { id: 6, value: "physics", label: "Physics" },
          { id: 7, value: "history", label: "History" },
          { id: 8, value: "geography", label: "Geography" },
          { id: 9, value: "business_studies", label: "Business Studies" },
          { id: 10, value: "computer_studies", label: "Computer Studies" },
        ]
        setSubjects(fallbackData)
      } finally {
        setIsLoading(false)
      }
    }

    loadSubjects()
  }, [onError])

  const toggleSubject = (value: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(value)) {
        return prev.filter((s) => s !== value)
      } else {
        return [...prev, value]
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSubjects.length < 3) {
      setError("Please select at least 3 subjects")
      if (onError) onError("Please select at least 3 subjects")
      return
    }
    onSubmit(selectedSubjects)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading subjects...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="text-base">Select your high school subjects (minimum 3)</Label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose the subjects you studied in high school</p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center">
              <Button
                type="button"
                variant={selectedSubjects.includes(subject.value) ? "default" : "outline"}
                className={`w-full justify-start ${
                  selectedSubjects.includes(subject.value) ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
                onClick={() => toggleSubject(subject.value)}
              >
                {subject.label}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          Next
        </Button>
      </div>
    </form>
  )
}
