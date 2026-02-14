/**
 * Refresh access token endpoint
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { verifyToken, createAccessToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Check if token exists and is not revoked
    const storedToken = await prisma.refresh_tokens.findUnique({
      where: { token: refreshToken },
      include: { users: true }
    })

    if (!storedToken || storedToken.revoked) {
      return NextResponse.json(
        { error: 'Invalid or revoked refresh token' },
        { status: 401 }
      )
    }

    // Check if token is expired
    if (new Date() > storedToken.expires_at) {
      return NextResponse.json(
        { error: 'Refresh token expired' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!storedToken.users.is_active) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      )
    }

    // Create new access token
    const accessToken = await createAccessToken({
      userId: storedToken.users.id,
      username: storedToken.users.username,
      email: storedToken.users.email,
    })

    return NextResponse.json({
      success: true,
      data: {
        accessToken
      }
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    )
  }
}
