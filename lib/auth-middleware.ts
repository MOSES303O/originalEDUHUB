// lib/auth-middleware.ts

import { type NextRequest, NextResponse } from "next/server"

export type AuthenticatedRequest = NextRequest & {
  user?: { id: number } // adjust type as needed (e.g., string or other fields)
}

type HandlerFn = (request: AuthenticatedRequest) => Promise<Response>

/**
 * Middleware that checks for an Authorization header and attaches a mock user.
 */
export async function withAuth(
  request: NextRequest,
  handler: HandlerFn
): Promise<Response> {
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 })
  }

  const token = authHeader.split(" ")[1]

  // Replace this with your real token validation logic
  const isValid = token === "mock-valid-token"
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })
  }

  // Simulate authenticated user
  const authenticatedRequest: AuthenticatedRequest = Object.assign(request, {
    user: { id: 1 }, // You can decode real token and extract user info here
  })

  // Pass authenticated request to actual handler
  return handler(authenticatedRequest)
}
