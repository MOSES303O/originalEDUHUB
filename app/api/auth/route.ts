import { NextResponse } from "next/server"
import { sign } from "jsonwebtoken"

// Mock user database
const users = [
  {
    id: 1,
    username: "johndoe",
    email: "john@example.com",
    password: "password123", // In a real app, this would be hashed
    hasPaid: true,
  },
  {
    id: 2,
    username: "janedoe",
    email: "jane@example.com",
    password: "password456", // In a real app, this would be hashed
    hasPaid: false,
  },
]

// Secret key for JWT (in a real app, this would be in an environment variable)
const JWT_SECRET = "your-secret-key"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Find user
    const user = users.find((u) => (u.username === username || u.email === username) && u.password === password)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate JWT token
    const token = sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        hasPaid: user.hasPaid,
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    )

    // Generate refresh token
    const refreshToken = sign(
      {
        id: user.id,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    return NextResponse.json({
      user_id: user.id,
      username: user.username,
      email: user.email,
      has_paid: user.hasPaid,
      access: token,
      refresh: refreshToken,
    })
  } catch (error) {
    console.error("Error in auth API:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 400 })
  }
}
