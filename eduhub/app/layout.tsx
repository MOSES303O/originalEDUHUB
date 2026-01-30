// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // CORE
  title: {
    default: "EduHub Kenya - Find Your Best University & KMTC Course 2025",
    template: "%s | EduHub Kenya",
  },
  description:
    "Best KCSE course finder in Kenya. Get personalized university & KMTC course recommendations based on your KCSE subjects, points & cluster requirements. Free & updated for 2025 intake.",

  // KEYWORDS — TOP SEARCH TERMS IN KENYA
  keywords: [
    "kuccps courses 2026",
    "best courses in Kenya",
    "university courses Kenya",
    "KMTC courses",
    "kuccps courses",
    "kuccps",
    "eduhub",
    "eduhub254",
    "eduhub kenya",
    "eduhub254.com",
    "KCSE course finder",
    "cluster points calculator",
    "degree courses Kenya",
    "diploma courses Kenya",
    "KCSE revision",
    "EduHub Kenya",
    "kuccps portal",
    "kmtc intake 2026",
    "edhubuke",
    "university admission Kenya",
    "best university Kenya",
    "course recommendation tool",
    "kcse results 2025",
    "career guidance Kenya",
    "higher education Kenya",
    "course selection Kenya",
    "kcse points calculator",
    "university application Kenya",
    "kmtc application 2026",
  ],

  // OPEN GRAPH / SOCIAL — CRITICAL FOR WHATSAPP & FACEBOOK SHARES
  openGraph: {
    title: "EduHub Kenya - Find Your Perfect Course 2025",
    description: "KCSE course finder for universities & KMTC,polytechnic,tvets..... in Kenya",
    url: "https://eduhub254.com",
    siteName: "EduHub254 Kenya",
    images: [
      {
        url: "https://eduhub254.com/og-image.jpg", // ← Create this 1200x630 image
        width: 1200,
        height: 630,
        alt: "EduHub Kenya - Best KCSE Course Finder",
      },
    ],
    locale: "en_KE",
    type: "website",
  },

  // TWITTER / X
  twitter: {
    card: "summary_large_image",
    title: "EduHub Kenya - Best KCSE Course Finder 2025",
    description: "Find your perfect university & KMTC course based on your KCSE results",
    images: ["https://eduhub254.com/og-image.jpg"],
    creator: "@eduhubkenya",
  },
  robots: {
    index: true, 
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // VERIFICATION (add your actual IDs)
  verification: {
    google: "JJKFDM6u6qyKpwsFQwQMMn2Te70mtBnruNrObhaLwkw",
    // bing: "your-bing-verification",
  },

  // ALTERNATES FOR MULTILINGUAL (if you expand)
  alternates: {
    canonical: "https://eduhub254.com",
  },

  // AUTHOR & PUBLISHER
  authors: [{ name: "EduHub Kenya Team", url: "https://eduhub254.com/about" }],
  creator: "EduHub Kenya",
  publisher: "EduHub Kenya",

  // FAVICONS
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10b981", // emerald-500
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* STRUCTURED DATA — GOOGLE LOVES THIS */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOccupationalProgram",
              name: "EduHub254 Kenya Campus Course Finder",
              description: "Free tool to find best university,TVETs,KMTC,polytechnics courses based on KCSE results",
              provider: {
                "@type": "Organization",
                name: "EduHub254 Kenya",
                sameAs: "https://eduhub254.com",
              },
              url: "https://eduhub254.com",
              inLanguage: "en-KE",
              educationalLevel: "Secondary",
              educationalCredentialAwarded: "KCSE",
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}