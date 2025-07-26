// frontend/app/page.tsx
"use client";

import './globals.css';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, BookOpen, Users, Award, ChevronDown, Download } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FindCourseForm } from "@/components/find-course-form";
import { AuthenticationModal } from "@/components/authentication-modal";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import React from "react";

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  render() {
    if (this.state.error) {
      console.error("Error in component:", this.state.error);
      return <div>Something went wrong in the modal. Please try again.</div>;
    }
    return this.props.children;
  }
}

export default function Home() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleGetStarted = () => {
    console.log("Home: handleGetStarted called, user:", user);
    if (user) {
      console.log("Home: Redirecting to /courses");
      router.push("/courses");
    } else {
      console.log("Home: Setting isFormOpen to true");
      setIsFormOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header onGetStarted={handleGetStarted} />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-gray-900 dark:text-gray-100">
                    Find Your Perfect University Course
                  </h1>
                  <p className="max-w-[600px] text-gray-700 dark:text-gray-200 md:text-xl">
                    Discover university courses that match your high school subjects and interests. Get personalized
                    recommendations based on your grades.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-green-400 hover:opacity-90 text-gray-900 dark:text-gray-100"
                    onClick={handleGetStarted}
                  >
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
                src="/image.png"
                width={800}
                height={550}
              />
            </div>
          </div>
        </section>
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-app-bg-light/80 dark:bg-app-bg-dark/80 px-3 py-1 text-sm text-gray-900 dark:text-gray-100">
                  HOW IT WORKS
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-gray-900 dark:text-gray-100">
                  Your Path to the Right University Course
                </h2>
                <p className="max-w-[900px] text-gray-700 dark:text-gray-200 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform helps you find university courses that match your high school subjects and interests.
                  Here is how it works.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4 rounded-lg border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-800">
                  <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Enter Your Subjects</h3>
                  <p className="text-gray-700 dark:text-gray-200">
                    Tell us about your high school subjects and the grades you achieved.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4 rounded-lg border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-800">
                  <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Get Matched</h3>
                  <p className="text-gray-700 dark:text-gray-200">
                    Our algorithm matches you with university courses that align with your academic profile.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4 rounded-lg border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-800">
                  <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Apply with Confidence</h3>
                  <p className="text-gray-700 dark:text-gray-200">
                    Apply to courses knowing you meet the requirements and have a good chance of acceptance.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-4 rounded-lg border p-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 bg-emerald-100 dark:bg-emerald-800 p-2 rounded-full">
                  <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">New Feature: PDF Downloads</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                    You can now download your selected courses as a PDF document for easy reference and sharing!
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-8">
              <Button
                className="bg-gradient-to-r from-emerald-500 to-green-400 hover:opacity-90 text-gray-900 dark:text-gray-100"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-emerald-100 dark:bg-emerald-800 px-3 py-1 text-sm text-gray-900 dark:text-gray-100">
                  TESTIMONIALS
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-gray-900 dark:text-gray-100">
                  What Our Users Say
                </h2>
                <p className="max-w-[900px] text-gray-700 dark:text-gray-200 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Hear from students who found their perfect university courses using our platform.
                </p>
              </div>
            </div>
            <div className="rounded-lg border mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4 rounded-lg border p-6 shadow-sm">
                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-200">
                    EduHub helped me find a computer science course that perfectly matched my math and physics
                    background. I am now studying at my dream university!
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">David Mwangi</h3>
                      <p className="text-xs text-gray-700 dark:text-gray-200">Computer Science Student</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4 rounded-lg border p-6 shadow-sm">
                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-200">
                    I was unsure about which course to take after high school. EduHub showed me options I had not
                    even considered that matched my biology and chemistry grades.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Faith Njeri</h3>
                      <p className="text-xs text-gray-700 dark:text-gray-200">Biomedical Science Student</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-emerald-100 dark:bg-emerald-800 px-3 py-1 text-sm text-gray-900 dark:text-gray-100">
                  FAQ
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-gray-900 dark:text-gray-100">
                  Frequently Asked Questions
                </h2>
                <p className="max-w-[900px] text-gray-700 dark:text-gray-200 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Find answers to common questions about our platform and university course matching.
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-3xl space-y-4 py-12">
              <div className="rounded-lg border">
                <details className="group p-6">
                  <summary className="flex cursor-pointer items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">How accurate are the course matches?</h3>
                    <ChevronDown className="h-5 w-5 text-gray-900 dark:text-gray-100 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-gray-700 dark:text-gray-200">
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Is this service free to use?</h3>
                    <ChevronDown className="h-5 w-5 text-gray-900 dark:text-gray-100 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-gray-700 dark:text-gray-200">
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Which universities are included in your database?</h3>
                    <ChevronDown className="h-5 w-5 text-gray-900 dark:text-gray-100 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-gray-700 dark:text-gray-200">
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Can I download my selected courses?</h3>
                    <ChevronDown className="h-5 w-5 text-gray-900 dark:text-gray-100 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-gray-700 dark:text-gray-200">
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
              <Button
                className="bg-gradient-to-r from-emerald-500 to-green-400 hover:opacity-90 text-gray-900 dark:text-gray-100"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      {isFormOpen && (
        <ErrorBoundary>
          <FindCourseForm
            onClose={() => {
              console.log("Home: Closing FindCourseForm");
              setIsFormOpen(false);
            }}
            setShowFindCourseForm={setIsFormOpen}
          />
        </ErrorBoundary>
      )}
      {isAuthModalOpen && <AuthenticationModal onClose={() => setIsAuthModalOpen(false)}  canClose={false} />}
    </div>
  );
}