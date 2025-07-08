"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/header"
import { UniversityRow } from "@/components/university-row"
import { Button } from "@/components/ui/button"
import { Table, TableBody,TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Heart } from "lucide-react"
import { universitiesData, enrichUniversityData } from "@/data/universities"
import Link from "next/link"
import { Footer } from "@/components/footer"

export default function UniversityPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [cityFilter, setCityFilter] = useState("all")
  const [selectedUniversities, setSelectedUniversities] = useState<Set<number>>(new Set())

  const universities = useMemo(() => enrichUniversityData(universitiesData), [])

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(universities.map((uni) => uni.city.toLowerCase()))]
    return uniqueCities.sort()
  }, [universities])

  const filteredUniversities = useMemo(() => {
    return universities.filter((university) => {
      const matchesSearch =
        searchTerm === "" ||
        university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        university.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        university.city.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCity = cityFilter === "all" || university.city.toLowerCase() === cityFilter

      return matchesSearch && matchesCity
    })
  }, [universities, searchTerm, cityFilter])

  const toggleUniversitySelection = (universityId: number) => {
    const newSelected = new Set(selectedUniversities)
    if (newSelected.has(universityId)) {
      newSelected.delete(universityId)
    } else {
      newSelected.add(universityId)
    }
    setSelectedUniversities(newSelected)
  }

  return (
    <div className="min-h-screen bg-app-bg-light dark:bg-app-bg-dark">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Back button and header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-transparent"
          >
            <Heart className="w-4 h-4 mr-2" />
            Selected Universities ({selectedUniversities.size})
          </Button>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Available Universities</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse through our comprehensive list of accredited universities
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search universities by name, code, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city.charAt(0).toUpperCase() + city.slice(1)}
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
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>University ID</TableHead>
                      <TableHead>University Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Available Courses</TableHead>
                      <TableHead className="text-center">Accreditation</TableHead>
                      <TableHead className="text-center">Select</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUniversities.map((university) => (
                <UniversityRow
                  key={university.id}
                  university={university}
                  isSelected={selectedUniversities.has(university.id)}
                  onSelect={() => toggleUniversitySelection(university.id)}
                  onViewCourses={(universityId, universityName) => {
                    console.log(`Viewing courses for ${universityName} (ID: ${universityId})`);
                    //ui problem here Add your logic for viewing courses here
                    }}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUniversities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No universities found matching your criteria.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}