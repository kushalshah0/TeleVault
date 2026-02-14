/**
 * User registration endpoint
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { hashPassword, createAccessToken, createRefreshToken, generateRefreshTokenString } from '@/lib/auth'
import { isValidEmail, isValidPassword } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password } = body

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.users.create({
      data: {
        username,
        email,
        hashed_password: hashedPassword,
        is_active: true,
      }
    })

    // Create tokens
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
    }

    const accessToken = await createAccessToken(tokenPayload)
    const refreshToken = await createRefreshToken(tokenPayload)

    // Store refresh token in database
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await prisma.refresh_tokens.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: expiresAt,
        revoked: false,
      }
    })

    // Log activity
    await prisma.activities.create({
      data: {
        user_id: user.id,
        username: user.username,
        activity_type: 'REGISTER',
        description: `User ${user.username} registered`,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
