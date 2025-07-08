"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/header"
import { CourseRow } from "@/components/course-row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody,TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Heart } from "lucide-react"
import { coursesData, universitiesData } from "@/data/universities"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Footer } from "@/components/footer"

export default function UniversityCoursesPage() {
  const params = useParams()
  const universityId = Number.parseInt(params.id as string)

  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())

  const university = universitiesData.find((u) => u.id === universityId)

  const courses = useMemo(() => {
    return coursesData.filter((course) => course.universityId === universityId)
  }, [universityId])

  const departments = useMemo(() => {
    const uniqueDepartments = [...new Set(courses.map((course) => course.department))]
    return uniqueDepartments.sort()
  }, [courses])

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        searchTerm === "" ||
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.department.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDepartment = departmentFilter === "all" || course.department === departmentFilter

      return matchesSearch && matchesDepartment
    })
  }, [courses, searchTerm, departmentFilter])

  const toggleCourseSelection = (courseId: string) => {
    const newSelected = new Set(selectedCourses)
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId)
    } else {
      newSelected.add(courseId)
    }
    setSelectedCourses(newSelected)
  }

  if (!university) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">University Not Found</h1>
            <Link href="/university">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Back to Universities</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Back button and header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/university">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Universities
            </Button>
          </Link>

          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
          >
            <Heart className="w-4 h-4 mr-2" />
            Selected Courses ({selectedCourses.size})
          </Button>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Available Courses - {university.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">Browse through courses offered by {university.name}</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search courses by name, ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead></TableHead>
                <TableHead>Course ID</TableHead>
                <TableHead>Course Name</TableHead>
                <TableHead>Required Points</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Select</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
          </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  isSelected={selectedCourses.has(course.id)}
                  onSelect={() => toggleCourseSelection(course.id)}
                  showUniversity={false}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No courses found matching your criteria.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
