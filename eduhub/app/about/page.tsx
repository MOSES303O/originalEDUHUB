"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function AboutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);

  const handleGetStarted = () => {
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else if (!user.hasPaid) {
      setShowAuthModal(true);
      toast({
        title: "Payment Required",
        description: "Please complete your payment to find courses.",
        variant: "destructive",
        duration: 3000,
      });
    } else {
      setShowFindCourseForm(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header currentPage="about" onGetStarted={handleGetStarted} user={user} />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 sm:py-16 md:py-24 lg:py-32">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
                About EduHub
              </h1>
              <p className="max-w-[700px] text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-xl">
                Helping students find their perfect Campus courses since 2020
              </p>
            </div>

            <div className="grid gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16 items-center mt-10 sm:mt-12">
              <div className="order-2 lg:order-1">
                <Image
                  src="/originalEDUHUB/images/boy.png"
                  width={600}
                  height={400}
                  alt="EduHub team"
                  className="rounded-lg object-cover w-full h-auto shadow-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-4 order-1 lg:order-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  At EduHub, we believe that every student deserves access to quality education that aligns with
                  their interests, strengths, and career aspirations. Our mission is to bridge the gap between high
                  school education and Campus courses by providing personalized recommendations based on students'
                  academic profiles.
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  We understand that choosing a Campus course is one of the most important decisions in a student's
                  life. That's why we've developed a comprehensive platform that analyzes students' high school subjects
                  and grades to match them with suitable Campus programs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-800">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
            <div className="grid gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="space-y-4 order-2 lg:order-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Our Story</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  EduHub was founded in 2020 by a group of education enthusiasts who recognized the challenges that
                  students face when transitioning from high school to Campus. Many students were selecting courses
                  based on limited information, peer pressure, or societal expectations rather than their own strengths
                  and interests.
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  What started as a small project to help local students in Nairobi has now grown into a comprehensive
                  platform serving thousands of students across Kenya. Our team has expanded to include education
                  specialists, career counselors, and technology experts who are passionate about transforming education
                  and career guidance.
                </p>
              </div>
              <div className="order-1 lg:order-2">
                <Image
                  src="/originalEDUHUB/images/about.png"
                  width={600}
                  height={400}
                  alt="EduHub history"
                  className="rounded-lg object-cover w-full h-auto shadow-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="w-full py-12 sm:py-16 md:py-24 lg:py-32">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
            <div className="flex flex-col items-center gap-4 text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900 dark:text-white">
                Our Values
              </h2>
              <p className="max-w-[700px] text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-xl">
                The principles that guide our work and decisions
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4 mb-4">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
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
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">Integrity</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We are committed to providing honest, unbiased information to help students make informed decisions
                  about their education and future careers.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4 mb-4">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
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
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">Innovation</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We continuously improve our platform and services by embracing new technologies and educational
                  methodologies to better serve our users.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4 mb-4">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
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
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">Inclusivity</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We believe in equal access to educational opportunities for all students, regardless of their
                  background, location, or economic status.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Team */}
        <section className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-800">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
            <div className="flex flex-col items-center gap-4 text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900 dark:text-white">
                Our Team
              </h2>
              <p className="max-w-[700px] text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-xl">
                Meet the dedicated professionals behind EduHub
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "John Kamau", role: "Founder & CEO" },
                { name: "Mary Wanjiku", role: "Education Director" },
                { name: "David Ochieng", role: "Chief Technology Officer" },
                { name: "Sarah Njeri", role: "Career Counselor" },
              ].map((member) => (
                <div key={member.name} className="flex flex-col items-center text-center">
                  <div className="mb-4 overflow-hidden rounded-full w-32 h-32 sm:w-40 sm:h-40 ring-4 ring-blue-100 dark:ring-blue-900">
                    <Image
                      src="/placeholder.svg?height=200&width=200"
                      width={200}
                      height={200}
                      alt={member.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section — BLUE gradient */}
        <section className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-white">
                  Join Our Community
                </h2>
                <p className="max-w-[700px] text-blue-100 text-sm sm:text-base md:text-xl mx-auto">
                  Start your educational journey with EduHub today
                </p>
              </div>
              <div className="w-full max-w-xs sm:max-w-sm space-y-2">
                <Button
                  className="w-full bg-white text-blue-600 hover:bg-gray-100 font-medium text-sm sm:text-base"
                  size="lg"
                  asChild
                >
                  <Link href="/signup">Get Started Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {showAuthModal && <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={true} />}
      {showFindCourseForm && (
        <FindCourseForm
          onClose={() => setShowFindCourseForm(false)}
          setShowFindCourseForm={setShowFindCourseForm}
        />
      )}
    </div>
  );
}