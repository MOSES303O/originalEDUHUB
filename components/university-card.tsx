import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, BookOpen, Building2 } from "lucide-react"
import Image from "next/image"
import type { UniversityWithCourses } from "@/types/university"

interface UniversityCardProps {
  university: UniversityWithCourses
}

export function UniversityCard({ university }: UniversityCardProps) {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-300 group">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {university.logo ? (
              <Image
                src={university.logo || "/placeholder.svg"}
                alt={`${university.name} logo`}
                width={64}
                height={64}
                className="rounded-lg object-cover border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  target.nextElementSibling?.classList.remove("hidden")
                }}
              />
            ) : null}
            <div
              className={`w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center ${university.logo ? "hidden" : ""}`}
            >
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight group-hover:text-blue-600 transition-colors">
              {university.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              <span className="capitalize">{university.city}</span>
              <span>•</span>
              <span className="capitalize">{university.campus}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <span className="font-medium">Code:</span>
              <Badge variant="outline" className="text-xs">
                {university.code}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-sm">{university.courseCount} Courses Available</span>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Departments</h4>
            <div className="flex flex-wrap gap-1">
              {university.departments.slice(0, 3).map((dept, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {dept.name}
                </Badge>
              ))}
              {university.departments.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{university.departments.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Faculties</h4>
            <div className="flex flex-wrap gap-1">
              {university.faculties.slice(0, 2).map((faculty, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {faculty.name}
                </Badge>
              ))}
              {university.faculties.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{university.faculties.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
