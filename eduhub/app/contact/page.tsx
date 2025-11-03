"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
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
      <Header currentPage="contact" onGetStarted={handleGetStarted} user={user} />
      <main className="flex-1">
        {/* Contact Form & Info */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900 dark:text-white">
                Contact Us
              </h1>
              <p className="max-w-[700px] text-gray-600 dark:text-gray-300 md:text-xl">
                Have questions or feedback? We'd love to hear from you.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2 items-start mt-12">
              {/* Contact Info + Map */}
              <div className="space-y-8">
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex flex-col space-y-6">
                      <div className="flex items-start space-x-4">
                        <MapPin className="h-6 w-6 text-emerald-600 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Our Location</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Westlands Business Park
                            <br />
                            Nairobi, Kenya
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <Mail className="h-6 w-6 text-emerald-600 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Email Us</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            eduhub254@gmail.com
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            support@eduhub254@gmail.com
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <Phone className="h-6 w-6 text-emerald-600 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Call Us</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            +254 743898322
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            +254 743808322
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="rounded-lg overflow-hidden h-[300px] md:h-[400px] border border-gray-200 dark:border-gray-700">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8176213990805!2d36.80943857576655!3d-1.2636895356313314!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f17366d4c4d7d%3A0x7b2a9f5a7c6c3f0a!2sWestlands%2C%20Nairobi!5e0!3m2!1sen!2ske!4v1682345678901!5m2!1sen!2ske"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="grayscale hover:grayscale-0 transition-all duration-300"
                  ></iframe>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <form className="space-y-6">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
                          Full Name
                        </label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          required
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-gray-900 dark:text-white">
                          Email Address
                        </label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          required
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium text-gray-900 dark:text-white">
                          Phone Number
                        </label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+254 712 345 678"
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="subject" className="text-sm font-medium text-gray-900 dark:text-white">
                          Subject
                        </label>
                        <Input
                          id="subject"
                          placeholder="How can we help you?"
                          required
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-medium text-gray-900 dark:text-white">
                          Message
                        </label>
                        <Textarea
                          id="message"
                          placeholder="Write your message here..."
                          className="min-h-[120px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Send Message
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center gap-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white">
                Frequently Asked Questions
              </h2>
              <p className="max-w-[700px] text-gray-600 dark:text-gray-300 md:text-xl">
                Find answers to common questions about EduHub
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  How does EduHub match me with courses?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  EduHub uses an advanced algorithm that analyzes your high school subjects, grades, and interests
                  to recommend Campus courses that align with your academic profile and career aspirations.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Is EduHub free to use?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Basic course matching is free, but we offer premium features for a small fee that provide more
                  detailed recommendations, career guidance, and application assistance.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  How accurate are the course recommendations?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Our recommendations are based on comprehensive data from Campuses and education experts. We
                  regularly update our database to ensure accuracy, but we always recommend consulting with school
                  counselors for final decisions.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Can I apply to Campuses through EduHub?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Currently, we don't process applications directly, but we provide information on application
                  procedures and deadlines for each course. We're working on partnerships with Campuses to
                  streamline the application process in the future.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section — Now with BLUISH gradient */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="container px-4 md:px-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-white">
                  Ready to Get Started?
                </h2>
                <p className="max-w-[700px] text-blue-100 md:text-xl mx-auto">
                  Join thousands of students who have found their perfect Campus course with EduHub
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <Button
                  className="w-full bg-white text-blue-600 hover:bg-gray-100 font-medium"
                  size="lg"
                  asChild
                >
                  <Link href="/login">Get Started Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {showAuthModal && (
        <AuthenticationModal onClose={() => setShowAuthModal(false)} canClose={true} />
      )}
      {showFindCourseForm && (
        <FindCourseForm
          onClose={() => setShowFindCourseForm(false)}
          setShowFindCourseForm={setShowFindCourseForm}
        />
      )}
    </div>
  );
}