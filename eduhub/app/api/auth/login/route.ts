import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// Mock users database (same as in register route)
const users = [
  {
    id: 1,
    email: "admin@example.com",
    name: "Admin User",
    password: "$2a$10$GQH.xZUBHMDUDePMXh2IxuoLn.2NCJzOj8yXvKmEZ.xng8qdYJZuO", // "password123"
    role: "admin",
  },
]

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate request body
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Find user by email
    const user = users.find((user) => user.email === body.email)

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(body.password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1d" },
    )

    // Return user data (excluding password) and token
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      token,
    })
  } catch (error) {
    console.error("Error logging in:", error)
    return NextResponse.json({ error: "Failed to log in" }, { status: 500 })
  }
}
