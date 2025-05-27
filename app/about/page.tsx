import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">About EduPathway</h1>
              <p className="max-w-[700px] text-gray-500 md:text-xl">
                Helping students find their perfect university courses since 2020
              </p>
            </div>
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center mt-12">
              <div>
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  width={600}
                  height={400}
                  alt="EduPathway team"
                  className="rounded-lg object-cover"
                />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Our Mission</h2>
                <p className="text-gray-500">
                  At EduPathway, we believe that every student deserves access to quality education that aligns with
                  their interests, strengths, and career aspirations. Our mission is to bridge the gap between high
                  school education and university courses by providing personalized recommendations based on students'
                  academic profiles.
                </p>
                <p className="text-gray-500">
                  We understand that choosing a university course is one of the most important decisions in a student's
                  life. That's why we've developed a comprehensive platform that analyzes students' high school subjects
                  and grades to match them with suitable university programs.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="space-y-4 order-2 lg:order-1">
                <h2 className="text-2xl font-bold">Our Story</h2>
                <p className="text-gray-500">
                  EduPathway was founded in 2020 by a group of education enthusiasts who recognized the challenges that
                  students face when transitioning from high school to university. Many students were selecting courses
                  based on limited information, peer pressure, or societal expectations rather than their own strengths
                  and interests.
                </p>
                <p className="text-gray-500">
                  What started as a small project to help local students in Nairobi has now grown into a comprehensive
                  platform serving thousands of students across Kenya. Our team has expanded to include education
                  specialists, career counselors, and technology experts who are passionate about transforming education
                  and career guidance.
                </p>
              </div>
              <div className="order-1 lg:order-2">
                <Image
                  src="/placeholder.svg?height=400&width=600"
                  width={600}
                  height={400}
                  alt="EduPathway history"
                  className="rounded-lg object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center gap-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter">Our Values</h2>
              <p className="max-w-[700px] text-gray-500 md:text-xl">The principles that guide our work and decisions</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-background shadow-sm">
                <div className="rounded-full bg-emerald-100 p-4 mb-4">
                  <svg
                    className="h-6 w-6 text-emerald-600"
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
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="m7 10 3 3 7-7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Integrity</h3>
                <p className="text-gray-500">
                  We are committed to providing honest, unbiased information to help students make informed decisions
                  about their education and future careers.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-background shadow-sm">
                <div className="rounded-full bg-emerald-100 p-4 mb-4">
                  <svg
                    className="h-6 w-6 text-emerald-600"
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
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Innovation</h3>
                <p className="text-gray-500">
                  We continuously improve our platform and services by embracing new technologies and educational
                  methodologies to better serve our users.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-background shadow-sm">
                <div className="rounded-full bg-emerald-100 p-4 mb-4">
                  <svg
                    className="h-6 w-6 text-emerald-600"
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
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Inclusivity</h3>
                <p className="text-gray-500">
                  We believe in equal access to educational opportunities for all students, regardless of their
                  background, location, or economic status.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center gap-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter">Our Team</h2>
              <p className="max-w-[700px] text-gray-500 md:text-xl">
                Meet the dedicated professionals behind EduPathway
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 overflow-hidden rounded-full">
                  <Image
                    src="/placeholder.svg?height=200&width=200"
                    width={200}
                    height={200}
                    alt="Team member"
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold">John Kamau</h3>
                <p className="text-sm text-gray-500">Founder & CEO</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 overflow-hidden rounded-full">
                  <Image
                    src="/placeholder.svg?height=200&width=200"
                    width={200}
                    height={200}
                    alt="Team member"
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold">Mary Wanjiku</h3>
                <p className="text-sm text-gray-500">Education Director</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 overflow-hidden rounded-full">
                  <Image
                    src="/placeholder.svg?height=200&width=200"
                    width={200}
                    height={200}
                    alt="Team member"
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold">David Ochieng</h3>
                <p className="text-sm text-gray-500">Chief Technology Officer</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 overflow-hidden rounded-full">
                  <Image
                    src="/placeholder.svg?height=200&width=200"
                    width={200}
                    height={200}
                    alt="Team member"
                    className="object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold">Sarah Njeri</h3>
                <p className="text-sm text-gray-500">Career Counselor</p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-emerald-600 dark:bg-emerald-700">
          <div className="container px-4 md:px-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-white">Join Our Community</h2>
                <p className="max-w-[700px] text-emerald-100 md:text-xl mx-auto">
                  Start your educational journey with EduPathway today
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <Button className="w-full bg-white text-emerald-600 hover:bg-gray-100" size="lg" asChild>
                  <Link href="/signup">Get Started Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
