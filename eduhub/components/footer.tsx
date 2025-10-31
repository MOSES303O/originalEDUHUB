import Link from 'next/link';
import { GraduationCap, Mail, Facebook, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-700 py-6 sm:py-8 md:py-12 bg-white dark:bg-gray-900">
      <div className="container px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand & Description */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
              <span className="text-base sm:text-lg font-bold gradient-text">EduHub</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Helping students find their perfect Campus courses based on their high school subjects and interests.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 text-sm sm:text-base">Quick Links</h3>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { name: "Home", path: "/" },
                { name: "About", path: "/about" },
                { name: "Courses", path: "/courses" },
                { name: "University", path: "/university" },
                { name: "Contact", path: "/contact" },
              ].map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-400 transition-colors animated-underline"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 text-sm sm:text-base">Legal</h3>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { name: "Terms of Service", path: "#" },
                { name: "Privacy Policy", path: "#" },
                { name: "Cookie Policy", path: "#" },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.path}
                    className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-400 transition-colors animated-underline"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 text-sm sm:text-base">Contact Us</h3>
            <ul className="space-y-3 sm:space-y-4">
              {/* Phone */}
              <li className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">+254 717 909 471</span>
              </li>

              {/* Email */}
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                <a
                  href="mailto:eduhub254@gmail.com"
                  className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-400 transition-colors"
                >
                  eduhub254@gmail.com
                </a>
              </li>

              {/* Social Icons */}
              <li className="flex items-center gap-2">
                {/* Facebook */}
                <Facebook className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                <a
                  href="https://www.facebook.com/share/17SBJQ2QAw/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 dark:text-gray-400 hover:text-emerald-400 transition-colors"
                  aria-label="Facebook"
                >                  
                Eduhub
                </a>
              </li>
              <li className="flex items-center gap-2">
                {/* Instagram */}
                <Instagram className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                <a
                  href="https://www.instagram.com/eduhubke"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 dark:text-gray-400 hover:text-emerald-400 transition-colors"
                  aria-label="Instagram"
                > 
                Eduhubke   
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} EduHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}