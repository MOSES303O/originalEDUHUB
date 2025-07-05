"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";

export function Header({ onGetStarted }: { onGetStarted?: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleGetStarted = () => {
    console.log("Header: Get Started clicked, user:", user, "onGetStarted exists:", !!onGetStarted);
    if (user) {
      console.log("Header: Redirecting to /courses");
      router.push("/courses");
    } else if (onGetStarted) {
      console.log("Header: Calling onGetStarted");
      onGetStarted();
    } else {
      console.error("Header: onGetStarted prop not provided");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Courses", path: "/courses" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled ? "bg-app-bg-light/90 dark:bg-app-bg-dark/90 backdrop-blur-md border-b border-app-bg-dark" : "bg-app-bg-light dark:bg-app-bg-dark"
      }`}
    >
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-emerald-500" />
          <span className="text-xl font-bold gradient-text">EduHub</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`text-sm font-medium transition-colors animated-underline ${
                pathname === item.path ? "text-emerald-500" : "text-gray-900 dark:text-gray-100 hover:text-emerald-400"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/signup"
            className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-emerald-400 transition-colors hidden md:block"
          >
            LOGIN PAY
          </Link>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-green-400 hover:opacity-90 text-gray-900 dark:text-gray-100"
            onClick={handleGetStarted}
          >
            Get Started
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-900 dark:text-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <motion.div
          className="md:hidden bg-app-bg-light/95 dark:bg-app-bg-dark/95 border-b border-app-bg-dark"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container py-4 flex flex-col space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`text-base font-medium px-2 py-2 rounded-md ${
                  pathname === item.path ? "bg-emerald-500/10 text-emerald-500" : "text-gray-900 dark:text-gray-100 hover:bg-app-bg-dark/50"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/signup"
              className="text-base font-medium px-2 py-2 rounded-md text-gray-900 dark:text-gray-100 hover:bg-app-bg-dark/50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login Pay
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  );
}