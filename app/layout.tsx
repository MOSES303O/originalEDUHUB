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
  title: "EduHub - Find Your Perfect University Course",
  description: "Discover university courses tailored to your high school subjects and interests.",
  keywords: "education, university, courses, career, high school, subjects, Kenya, university courses",
  authors: [{ name: "EduHub Team" }],
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
        <meta name="theme-color" content="#10b981" />
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
