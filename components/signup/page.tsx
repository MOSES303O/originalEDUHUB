"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

export default function SignupPage() {
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "loading" | "success" | "failed">("idle")
  const [countdown, setCountdown] = useState(5)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const status = searchParams.get("status")

    if (status === "success") {
      setPaymentStatus("success")
    } else if (status === "failed") {
      setPaymentStatus("failed")
    }
  }, [searchParams])

  // Countdown effect after successful payment
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (paymentStatus === "success" && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    } else if (paymentStatus === "success" && countdown === 0) {
      // Skip cluster calculation to avoid errors
      // Redirect to courses page directly
      router.push("/courses")
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [paymentStatus, countdown, router])

  return (
    <div>
      <h1>Signup Page</h1>
      {paymentStatus === "idle" && <p>Waiting for payment...</p>}
      {paymentStatus === "loading" && <p>Processing payment...</p>}
      {paymentStatus === "success" && <p>Payment successful! Redirecting to courses in {countdown} seconds...</p>}
      {paymentStatus === "failed" && <p>Payment failed. Please try again.</p>}
    </div>
  )
}
