//Layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import './globals.css';
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EduHub - Find Your Perfect Campus Course",
  description: "Discover Campus courses tailored to your high school subjects and interests.",
  keywords: "education, university,Campuses,campus,eduhub.com,kuccps,kmtc, courses, career, high school, subjects,kcse,colleges,polytechnics Kenya, university courses",
  authors: [{ name: "EduHub Team" }],
  icons: {
    icon: "/favicon.ico",
  },
}
// ✅ ADD this separately
export const viewport = {
  width: "device-width",
  initialScale: 1,
}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.className} antialiased`} >
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
