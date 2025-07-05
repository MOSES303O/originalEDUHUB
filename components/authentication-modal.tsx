"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Loader2, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthenticationModalProps {
  onClose: () => void
}

export function AuthenticationModal({ onClose }: AuthenticationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [stkPushSent, setStkPushSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and format as needed
    const value = e.target.value.replace(/[^\d]/g, "")
    setPhoneNumber(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate phone number (simple validation for Kenya numbers)
    if (!phoneNumber || phoneNumber.length < 9) {
      setError("Please enter a valid phone number")
      return
    }

    setIsSubmitting(true)

    // Simulate STK push
    setTimeout(() => {
      setIsSubmitting(false)
      setStkPushSent(true)
      setCountdown(15)
    }, 2000)
  }

  // Countdown effect after STK push
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (stkPushSent && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    } else if (stkPushSent && countdown === 0) {
      // Skip cluster calculation to avoid errors
      // Just navigate to courses page directly
      router.push("/courses")
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [stkPushSent, countdown, router])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-[#1a2521]">
        <CardHeader>
          <div className="flex items-center  justify-between">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <CardDescription>Please enter your phone number to access your account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {stkPushSent ? (
                <div className="space-y-4">
                  <Alert className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      STK push sent to your phone. Please check your phone and complete the payment.
                    </AlertDescription>
                  </Alert>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Waiting for payment confirmation...</p>
                    <p className="text-sm text-gray-500">Auto-redirecting in {countdown} seconds</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                      <div
                        className="bg-emerald-600 h-2.5 rounded-full"
                        style={{ width: `${(countdown / 15) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (M-Pesa)</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">+254</div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="712345678"
                      className="rounded-l-none"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      maxLength={10}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">Enter your M-Pesa registered phone number</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            {!stkPushSent && (
              <Button variant="outline" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending STK Push...
                  </>
                ) : (
                  "Send STK Push"
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
