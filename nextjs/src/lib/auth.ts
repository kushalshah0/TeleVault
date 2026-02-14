/**
 * JWT Authentication utilities
 */
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { JWTPayload } from '@/types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this'
)

const ACCESS_TOKEN_EXPIRE_MINUTES = 120 // 2 hours - enough for large file uploads
const REFRESH_TOKEN_EXPIRE_DAYS = 7

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create an access token (short-lived)
 */
export async function createAccessToken(payload: {
  userId: number
  username: string
  email: string
}): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRE_MINUTES}m`)
    .sign(JWT_SECRET)

  return token
}

/**
 * Create a refresh token (long-lived)
 */
export async function createRefreshToken(payload: {
  userId: number
  username: string
  email: string
}): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRE_DAYS}d`)
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Verify authentication from request and return user payload
 */
export async function verifyAuth(request: NextRequest): Promise<JWTPayload | null> {
  const token = extractTokenFromHeader(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<JWTPayload> {
  const user = await verifyAuth(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Generate a random refresh token string
 */
export function generateRefreshTokenString(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('')
}
