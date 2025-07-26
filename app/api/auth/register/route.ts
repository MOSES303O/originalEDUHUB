import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// Mock users database
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
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = users.find((user) => user.email === body.email)

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10)

    // Create new user
    const newUser = {
      id: users.length + 1,
      email: body.email,
      name: body.name,
      password: hashedPassword,
      role: body.role || "user",
    }

    // Add to mock database
    users.push(newUser)

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1d" },
    )

    // Return user data (excluding password) and token
    const { password, ...userWithoutPassword } = newUser

    return NextResponse.json(
      {
        user: userWithoutPassword,
        token,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error registering user:", error)
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 })
  }
}
