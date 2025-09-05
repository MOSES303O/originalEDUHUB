"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PDFNotificationProps {
  onClose: () => void
  onDownload: () => void
}

export function PDFNotification({ onClose, onDownload }: PDFNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Delay the appearance for a better UX
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md transition-all duration-300 z-50 border border-emerald-200 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="bg-emerald-100 dark:bg-emerald-800 p-2 rounded-full mr-3">
            <svg
              className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Download Your Courses</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              You can now download your selected courses as a PDF document for easy reference!
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 flex space-x-3">
        <Button variant="outline" size="sm" onClick={onClose}>
          Maybe Later
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          size="sm"
          onClick={() => {
            onDownload()
            onClose()
          }}
        >
          Download PDF
        </Button>
      </div>
    </div>
  )
}
