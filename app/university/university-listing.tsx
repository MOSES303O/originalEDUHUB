"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/header"
import { UniversityRow } from "@/components/university-row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Heart } from "lucide-react"
import { mockApiResponse, enrichUniversityData } from "@/data/mock-data"

interface UniversityListingProps {
  onNavigateToCourses?: (universityId?: number, universityName?: string) => void
}

export default function UniversityListing({ onNavigateToCourses }: UniversityListingProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [cityFilter, setCityFilter] = useState("all")
  const [selectedUniversities, setSelectedUniversities] = useState<Set<number>>(new Set())

  const universities = useMemo(() => enrichUniversityData(mockApiResponse), [])

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

  const handleViewCourses = (universityId: number, universityName: string) => {
    if (onNavigateToCourses) {
      onNavigateToCourses(universityId, universityName)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="universities" />

      <div className="container mx-auto px-4 py-8">
        {/* Back button and header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:text-white bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Button variant="outline" className="border-gray-600 text-gray-300 hover:text-white bg-transparent">
            <Heart className="w-4 h-4 mr-2" />
            Selected Universities ({selectedUniversities.size})
          </Button>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Available Universities</h1>
          <p className="text-gray-400">Browse through our comprehensive list of accredited universities</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search universities by name, code, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
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
        <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-4 text-left text-gray-300 font-medium"></th>
                <th className="p-4 text-left text-gray-300 font-medium">University ID</th>
                <th className="p-4 text-left text-gray-300 font-medium">University Name</th>
                <th className="p-4 text-left text-gray-300 font-medium">Location</th>
                <th className="p-4 text-center text-gray-300 font-medium">Available Courses</th>
                <th className="p-4 text-center text-gray-300 font-medium">Accreditation</th>
                <th className="p-4 text-center text-gray-300 font-medium">Select</th>
                <th className="p-4 text-center text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUniversities.map((university) => (
                <UniversityRow
                  key={university.id}
                  university={university}
                  isSelected={selectedUniversities.has(university.id)}
                  onSelect={() => toggleUniversitySelection(university.id)}
                  onViewCourses={handleViewCourses}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredUniversities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No universities found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
