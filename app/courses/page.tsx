"use client"

import  React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronDown, ChevronRight, CheckCircle, XCircle, Check, Heart } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { fetchCourses } from "@/lib/api"
import { CoursesSkeleton } from "@/components/courses-skeleton"
import { useSelectedCourses, type Course } from "@/lib/course-store"
import { useToast } from "@/hooks/use-toast";
import { AuthenticationModal } from "@/components/authentication-modal"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const gradeMap: Record<string, number> = {
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
export default function CoursesPage() {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [coursesData, setCoursesData] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const searchParams = useSearchParams()
  const { toast } = useToast() // ✅ Fix for toast error
  // Get user's total points from URL params
  const userPoints = Number.parseInt(searchParams.get("points") || "0", 10)
  const userGrade = searchParams.get("grade") || ""
 
  // Get subject filters and points from URL once
  const subjectParams = searchParams.getAll("subjects")
  const pointsParam = searchParams.get("points")

  // Use our custom hook for selected courses
  const { selectedCourses, toggleCourseSelection, isCourseSelected } = useSelectedCourses()

  useEffect(() => {
    // Check if user is authenticated and has paid
    if (user && !user.hasPaid) {
      // User exists but hasn't paid - show authentication modal
      setShowAuthModal(true)
      return
    }

    async function loadCourses() {
      try {
        setLoading(true)

        // Get subject filters from URL if any
        const subjects = subjectParams.map((s) => {
          const [subject] = s.split(":")
          return subject
        })

        // Fetch courses from API
        const params: Record<string, string | string[]> = {}
        if (subjects.length > 0) {
          params.subject = subjects
        }
        if (userPoints > 0) {
          params.min_points = userPoints.toString()
        }

        const data = await fetchCourses(params)

        // Check if data is valid
        if (!data || !Array.isArray(data)) {
          throw new Error("Invalid data received from API")
        }

        setCoursesData(data)
      } catch (err) {
        console.error("Error loading courses:", err)
        setError("Failed to load courses. Please try again later.")

        // Use fallback data
        const fallbackData = [
          {
            id: "CS001",
            code: "BSC-CS-001",
            name: "Bachelor of Computer Science",
            university_name: "University of Nairobi",
            description:"IT all the the way",
            minimum_grade: "B", // ✅ required
            tuition_fee_per_year: "50000.00", // optional if required
            application_fee: "1000.00", // optional
            average_rating: 4,
            total_reviews: 10,
            category: "technology",
            duration_years: 4,
            is_selected: false,
          },
          {
            id: "BA001",
            code: "BBA-001",
            name: "Bachelor of Business Administration",
            university_name: "Strathmore University",
            description:"biashara ni biashara",
            minimum_grade: "B-", // ✅ required
            tuition_fee_per_year: "60000.00",
            application_fee: "1500.00",
            average_rating: 4,
            total_reviews: 8,
            category: "business",
            duration_years: 4,
            is_selected: false,
          },
          {
            id: "MD001",
            code: "MBChB-001",
            name: "Bachelor of Medicine and Surgery",
            university_name: "Kenyatta University",
            description:"medicine is the dawa",
            minimum_grade: "A-", // ✅ required
            tuition_fee_per_year: "70000.00",
            application_fee: "2000.00",
            average_rating: 5,
            total_reviews: 12,
            category: "medical",
            duration_years: 6,
            is_selected: false,
          },
        ]  
        const transformedData = fallbackData.map((course) => ({
          ...course,
          duration_years: course.duration_years.toString(), // Convert number to string
        }));
        
        setCoursesData(transformedData);
      } finally {
        // Add a slight delay to ensure smooth transition
        setTimeout(() => {
          setLoading(false)
        }, 500)
      }
    }

    loadCourses()
    // Use stable references to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const isQualified = (minGrade: string): boolean => {
    return gradeMap[userGrade] >= gradeMap[minGrade]
  }

  const handleSelectCourse = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation()
    try {
      toggleCourseSelection(course)

      if (!isCourseSelected(course.id)) {
        toast({
          title: "Course Selected",
          description: `${(course as Course).name} has been added to your selected courses.`,
          duration: 3000,
        })
      } else {
        toast({
          title: "Course Removed",
          description: `${(course as Course).name} has been removed from your selected courses.`,
          duration: 3000,
        })
      }
    } catch (err) {
      console.error("Error selecting course:", err)
      toast({
        title: "Error",
        description: "Failed to update course selection. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 ">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-start gap-4 mb-8">
              <Button variant="outline" size="sm" asChild className="mb-2">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full">
                <div>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Available Courses</h1>
                  <p className="text-gray-500 md:text-xl">
                    Browse through our comprehensive list of university courses
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => router.push("/selected-courses")}
                  >
                    <Heart className="h-4 w-4" />
                    Selected Courses ({selectedCourses.length})
                  </Button>
                </div>
              </div>

              {userPoints > 0 && (
                <div className="flex items-center mt-2">
                  <Badge variant="outline" className="text-sm py-1 px-3 border-emerald-200 dark:border-emerald-800">
                    Your Total Points: {userPoints}
                  </Badge>
                </div>
              )}
            </div>

            {loading ? (
              <CoursesSkeleton />
            ) : error ? (
              <div className="flex justify-center items-center p-8 rounded-md border bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-300">
                <p>{error}</p>
                <Button variant="outline" className="ml-4" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : coursesData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-md border bg-gray-50 dark:bg-gray-800">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No courses found matching your criteria.</p>
                <Button asChild variant="outline">
                  <Link href="/">Start a New Search</Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Course ID</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Required Points</TableHead>
                      <TableHead>Qualification</TableHead>
                      <TableHead>Select</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesData.map((course) => (
                      <React.Fragment key={course.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(course.id)}
                      >
                        <TableCell>
                          {expandedRows[course.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{course.code}</TableCell>
                        <TableCell>{(course as Course).name}</TableCell>
                        <TableCell>{(course as Course).university_name}</TableCell>
                        <TableCell>{(course as Course).minimum_grade}</TableCell>
                        <TableCell>
                          {isQualified((course as Course).minimum_grade) ? (
                            <div className="flex items-center">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
                              <span className="text-green-500">Qualified</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <XCircle className="h-5 w-5 text-red-500 mr-1" />
                              <span className="text-red-500">Not Qualified</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={isCourseSelected(course.id) ? "default" : "outline"}
                            size="sm"
                            className={isCourseSelected(course.id) ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                            onClick={(e) => handleSelectCourse(e, course)}
                          >
                            {isCourseSelected(course.id) ? <Check className="h-4 w-4" /> : "Select"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/courses/${course.id}`)
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows[course.id] && (
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={8} className="p-4">
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-semibold">Course Code</h4>
                                  <p>{course.code}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold">Course Name</h4>
                                  <p>{course.name}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold">University</h4>
                                  <p>{course.university_name}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold">Qualification Status</h4>
                                  {isQualified(course.minimum_grade) ? (
                                    <div className="flex items-center">
                                      <CheckCircle className="h-5 w-5 text-green-500 mr-1" />
                                      <span className="text-green-500">You meet the cluster weight requirements</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center">
                                      <XCircle className="h-5 w-5 text-red-500 mr-1" />
                                      <span className="text-red-500">You do not meet the cluster weight requirements</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="pt-2 flex gap-2">
                                <Button
                                  variant={isCourseSelected(course.id) ? "default" : "outline"}
                                  className={isCourseSelected(course.id) ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                  onClick={(e) => handleSelectCourse(e, course)}
                                >
                                  {isCourseSelected(course.id) ? (
                                    <>
                                      <Check className="h-4 w-4 mr-2" />
                                      Selected
                                    </>
                                  ) : (
                                    "Add to Selected"
                                  )}
                                </Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
                                  <Link href={`/courses/courses/${course.id}`}>View Course Details</Link>
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />

      {/* Authentication Modal for Existing Users */}
      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}
