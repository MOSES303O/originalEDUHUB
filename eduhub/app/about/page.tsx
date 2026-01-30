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
                About EduHub Kenya
              </h1>
              <p className="max-w-[700px] text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-xl">
                Kenya’s most trusted Premium KCSE course finder since 2020 — helping thousands of students discover the best university, KMTC, TVET & polytechnic courses
              </p>
            </div>

            <div className="grid gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16 items-center mt-10 sm:mt-12">
              <div className="order-2 lg:order-1">
                <Image
                  src="/images/boy.png"
                  width={600}
                  height={400}
                  alt="Kenyan student using EduHub to find best KCSE courses"
                  className="rounded-lg object-cover w-full h-auto shadow-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-4 order-1 lg:order-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  We believe every KCSE student in Kenya deserves to know exactly which university, KMTC, TVET or polytechnic course they qualify for — and which one is truly right for them.
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  That’s why we built EduHub — a Premium platform that analyzes your KCSE subjects and grades to give you accurate, personalized course recommendations from all public and private institutions in Kenya.
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
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Our Journey</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  EduHub Kenya started in 2020 when a group of former KCSE students realized how hard it was to get clear, honest advice about university and college courses.
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  Many students were choosing courses based on what their friends,parents,relatives picked, what sounded “prestigious,” or what parents wanted — not what they were good at or passionate about.
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  Today, EduHub is used by over 100,000 students across Kenya — from Nairobi to Kisumu, Mombasa to Eldoret — and we believe career guidance should never have a price tag and a decision that touches and impact ones future derectly should be made with the right guidance data.
                </p>
              </div>
              <div className="order-1 lg:order-2">
                <Image
                  src="/images/about.png"
                  width={600}
                  height={400}
                  alt="EduHub Kenya team helping students find the right course"
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
                What we stand for — every single day
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4 mb-4">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="m7 10 3 3 7-7" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">Honesty & Accuracy</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We give you real data from KUCCPS, universities and KMTCs — no fake promises,accurate and precise recommendations.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4 mb-4">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">Free Forever</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  No subscriptions. No hidden fees. Every Kenyan student deserves access — and we’ll keep it that way.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4 mb-4">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 dark:text-white">Student-First</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We are students and former students — we know what you’re going through. This platform was built for you.
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
                Meet the EduHub Kenya Team
              </h2>
              <p className="max-w-[700px] text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-xl">
                Passionate Kenyans dedicated to helping the next generation find their path
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "ochieng moses", role: "Founder & CEO" },
                { name: "victor ochieng", role: "Education Director" },
                { name: "jackline atieno", role: "Chief Technology Officer" },
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
        <section className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-gradient-to-r text-gray-900 dark:text-white">
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-white">
                  Ready to Find Your Perfect Course?
                </h2>
                <p className="max-w-[700px] text-blue-100 text-sm sm:text-base md:text-xl mx-auto">
                  Join over 100,000 Kenyan students who found their dream course with EduHub
                </p>
              </div>
              <div className="w-full max-w-xs sm:max-w-sm space-y-2">
                <Button
                  className="w-full bg-white text-blue-600 hover:bg-gray-100 font-medium text-sm sm:text-base"
                  size="lg"
                  asChild
                >
                  <Link href="/courses">Start Now</Link>
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