// frontend/components/header.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface HeaderProps {
  currentPage?: string;
  onGetStarted?: () => void;
  user?: any;
}

export function Header({ onGetStarted, user }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
    { name: "Courses", path: "/courses" },
    { name: "KMTC", path: "/kmtc" },
    { name: "Universities", path: "/university" },
    { name: "Contact", path: "/contact" },
    { name: "About", path: "/about" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
          : "bg-white dark:bg-gray-900"
      }`}
    >
      <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl flex h-14 sm:h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-500" />
            <span className="text-base sm:text-lg md:text-xl font-bold gradient-text">EduHub</span>
          </Link>
        </div>
        <nav className="hidden lg:flex items-center gap-4 sm:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`text-xs sm:text-sm font-medium transition-colors animated-underline ${
                pathname === item.path ? "text-emerald-500" : "text-gray-900 dark:text-gray-100 hover:text-emerald-400"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-emerald-400 transition-colors hidden lg:block animated-underline"
          >
            LOGIN PAY
          </Link>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-green-400 hover:opacity-90 text-gray-900 dark:text-gray-100 text-xs sm:text-sm"
            onClick={handleGetStarted}
          >
            Get Started
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-900 dark:text-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <motion.div
          className="lg:hidden bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl py-4 flex flex-col space-y-3 sm:space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`text-sm sm:text-base font-medium px-2 py-2 rounded-md ${
                  pathname === item.path
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/login"
              className="text-sm sm:text-base font-medium px-2 py-2 rounded-md text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
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