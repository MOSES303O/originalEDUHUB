import { NextResponse } from "next/server"

// Mock subjects data
const subjects = [
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
  { id: 11, value: "agriculture", label: "Agriculture" },
  { id: 12, value: "home_science", label: "Home Science" },
  { id: 13, value: "art_design", label: "Art & Design" },
  { id: 14, value: "music", label: "Music" },
  { id: 15, value: "religious_education", label: "Religious Education" },
]

export async function GET() {
  // Return mock data
  return NextResponse.json(subjects)
}
