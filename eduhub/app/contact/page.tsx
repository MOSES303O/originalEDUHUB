"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AuthenticationModal } from "@/components/authentication-modal";
import { FindCourseForm } from "@/components/find-course-form";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { submitContactForm } from "@/lib/api";

export default function ContactPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFindCourseForm, setShowFindCourseForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleGetStarted = () => {
    if (!user) {
      setShowAuthModal(true);
      toast({
        title: "Authentication Required",
        description: "Please log in to find courses.",
        variant: "destructive",
      });
    } else if (!user.hasPaid) {
      setShowAuthModal(true);
      toast({
        title: "Payment Required",
        description: "Please complete your payment to find courses.",
        variant: "destructive",
      });
    } else {
      setShowFindCourseForm(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await submitContactForm(formData);

      if (result.received) {
        toast({
          title: "Message Sent!",
          description: "We'll get back to you soon.",
        });
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      }
    } catch (err: any) {
      const message = err.message || "Failed to send message.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                Have questions,complaints or feedback? We'd love to hear from you.
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
                            Westlands Business Park<br />Nairobi, Kenya
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
                            support@eduhub254.com
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-4">
                        <Phone className="h-6 w-6 text-emerald-600 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Call Us</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            +254 717909471
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
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.815140221828!2d36.801803!3d-1.267524!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1729f7b8a5b7%3A0x6e5e5e5e5e5e5e5e!2sWestlands%20Business%20Park!5e0!3m2!1sen!2ske!4v1698765432100!5m2!1sen!2ske"
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
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
                          Full Name
                        </label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Hope June"
                          required
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-gray-900 dark:text-white">
                          Email Address
                        </label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Hope@example.com"
                          required
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium text-gray-900 dark:text-white">
                          Phone Number
                        </label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+254 712 345 678"
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="subject" className="text-sm font-medium text-gray-900 dark:text-white">
                          Subject
                        </label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="How can we help you?"
                          required
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="message" className="text-sm font-medium text-gray-900 dark:text-white">
                          Message
                        </label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Write your message here..."
                          className="min-h-[120px] bg-white dark:bg-gray-800"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {loading ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ & CTA (unchanged) */}
        {/* Add your FAQ section here if needed */}
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