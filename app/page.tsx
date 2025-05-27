"use client"

import './globals.css';
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GraduationCap, ArrowRight, BookOpen, Users, Award, ChevronDown, Download } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { FindCourseForm } from "@/components/find-course-form"
import { AuthenticationModal } from "@/components/authentication-modal"
import { useAuth } from "@/lib/auth-context"

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleGetStarted = () => {
    if (user) {
      router.push("/courses")
    } else {
      setIsFormOpen(true)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xl font-bold">EduPathway</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-emerald-600 dark:text-emerald-400 transition-colors">
              Home
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              About
            </Link>
            <Link
              href="/courses"
              className="text-sm font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Courses
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <Button variant="outline" onClick={() => router.push("/courses")}>
                My Courses
              </Button>
            ) : (
              <Link
                href="#"
                onClick={() => setIsAuthModalOpen(true)}
                className="text-sm font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors hidden md:block"
              >
                Sign In
              </Link>
            )}
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleGetStarted}>
              Get Started
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Find Your Perfect University Course
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                    Discover university courses that match your high school subjects and interests. Get personalized
                    recommendations based on your grades.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleGetStarted}>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => scrollToSection("how-it-works")}>
                    Learn More
                  </Button>
                </div>
              </div>
              <Image
              alt="Students studying"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
              src="/placeholder.svg"
              width={800}
              height={550}
/>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm dark:bg-secondary/80">
                  HOW IT WORKS
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Your Path to the Right University Course
                </h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Our platform helps you find university courses that match your high school subjects and interests.
                  Here is how it works.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-800">
                  <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Enter Your Subjects</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Tell us about your high school subjects and the grades you achieved.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-800">
                  <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Get Matched</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Our algorithm matches you with university courses that align with your academic profile.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-800">
                  <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Apply with Confidence</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Apply to courses knowing you meet the requirements and have a good chance of acceptance.
                  </p>
                </div>
              </div>
            </div>

            {/* New PDF feature notification */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-emerald-200 p-4 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 bg-emerald-100 dark:bg-emerald-800 p-2 rounded-full">
                  <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">New Feature: PDF Downloads</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    You can now download your selected courses as a PDF document for easy reference and sharing!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleGetStarted}>
                Get Started Now
              </Button>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-emerald-100 px-3 py-1 text-sm dark:bg-emerald-800">
                  TESTIMONIALS
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">What Our Users Say</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Hear from students who found their perfect university courses using our platform.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4 rounded-lg border p-6 shadow-sm">
                <div className="space-y-2">
                  <p className="text-gray-500 dark:text-gray-400">
                    EduPathway helped me find a computer science course that perfectly matched my math and physics
                    background. I am now studying at my dream university!
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div>
                      <h3 className="text-sm font-bold">David Mwangi</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Computer Science Student</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4 rounded-lg border p-6 shadow-sm">
                <div className="space-y-2">
                  <p className="text-gray-500 dark:text-gray-400">
                    I was unsure about which course to take after high school. EduPathway showed me options I had not
                    even considered that matched my biology and chemistry grades.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div>
                      <h3 className="text-sm font-bold">Faith Njeri</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Biomedical Science Student</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-emerald-100 px-3 py-1 text-sm dark:bg-emerald-800">FAQ</div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Frequently Asked Questions</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Find answers to common questions about our platform and university course matching.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-3xl space-y-4 py-12">
              <div className="rounded-lg border">
                <details className="group p-6">
                  <summary className="flex cursor-pointer items-center justify-between">
                    <h3 className="text-lg font-medium">How accurate are the course matches?</h3>
                    <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-gray-500 dark:text-gray-400">
                    <p>
                      Our course matches are based on the official entry requirements published by universities. We
                      consider your subjects, grades, and the specific requirements for each course to provide accurate
                      recommendations.
                    </p>
                  </div>
                </details>
              </div>
              <div className="rounded-lg border">
                <details className="group p-6">
                  <summary className="flex cursor-pointer items-center justify-between">
                    <h3 className="text-lg font-medium">Is this service free to use?</h3>
                    <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-gray-500 dark:text-gray-400">
                    <p>
                      We offer a basic free service that provides general course matches. For more detailed
                      recommendations, personalized guidance, and application support, we offer a premium service for a
                      small fee.
                    </p>
                  </div>
                </details>
              </div>
              <div className="rounded-lg border">
                <details className="group p-6">
                  <summary className="flex cursor-pointer items-center justify-between">
                    <h3 className="text-lg font-medium">Which universities are included in your database?</h3>
                    <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-gray-500 dark:text-gray-400">
                    <p>
                      We include all major public and private universities in Kenya, including University of Nairobi,
                      Kenyatta University, Strathmore University, JKUAT, and many more. Our database is regularly
                      updated with the latest course offerings.
                    </p>
                  </div>
                </details>
              </div>
              <div className="rounded-lg border">
                <details className="group p-6">
                  <summary className="flex cursor-pointer items-center justify-between">
                    <h3 className="text-lg font-medium">Can I download my selected courses?</h3>
                    <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-gray-500 dark:text-gray-400">
                    <p>
                      Yes! We have added a new feature that allows you to download your selected courses as a PDF
                      document. This makes it easy to share your course selections with parents, teachers, or
                      counselors, and keep a record of your options for future reference.
                    </p>
                  </div>
                </details>
              </div>
            </div>
            <div className="flex justify-center">
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleGetStarted}>
                Get Started
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-gray-50 dark:bg-gray-900 py-6 md:py-12">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-emerald-600" />
                <span className="text-lg font-bold">EduPathway</span>
              </div>
              <p className="text-sm text-gray-500">
                Helping students find their perfect university courses based on their high school subjects and
                interests.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-sm hover:text-emerald-600 transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-sm hover:text-emerald-600 transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/courses" className="text-sm hover:text-emerald-600 transition-colors">
                    Courses
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm hover:text-emerald-600 transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-sm hover:text-emerald-600 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm hover:text-emerald-600 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm hover:text-emerald-600 transition-colors">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact Us</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span className="text-sm">+254 712 345 678</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect height="16" rx="2" width="20" x="2" y="4" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span className="text-sm">info@edupathway.co.ke</span>
                </li>
                <li className="flex gap-4 mt-4">
                  <a href="#" className="text-gray-500 hover:text-emerald-600 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-500 hover:text-emerald-600 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-500 hover:text-emerald-600 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} EduPathway. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Find Course Form */}
      {isFormOpen && <FindCourseForm onClose={() => setIsFormOpen(false)} />}

      {/* Authentication Modal for Existing Users */}
      {isAuthModalOpen && <AuthenticationModal onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  )
}
