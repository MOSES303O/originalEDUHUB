"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"

interface AuthContextType {
  user: any | null
  loading: boolean
  signIn: (token: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      // Basic JWT payload extraction (not validation)
      try {
        const payload = JSON.parse(atob(storedToken.split(".")[1]))
        setUser(payload) // Set user based on JWT payload
      } catch (error) {
        console.error("Error decoding JWT:", error)
        localStorage.removeItem("token") // Remove invalid token
        setUser(null)
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (token: string) => {
    localStorage.setItem("token", token)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setUser(payload)
    } catch (error) {
      console.error("Error decoding JWT:", error)
      toast({
        title: "Authentication Failed",
        description: "Could not decode authentication token.",
        variant: "destructive",
      })
      localStorage.removeItem("token")
      setUser(null)
      return
    }

    toast({
      title: "Login successful!",
      description: "You are now logged in.",
    })
  }

  const signOut = async () => {
    localStorage.removeItem("token")
    setUser(null)
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    })
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
