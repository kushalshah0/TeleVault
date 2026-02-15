import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { hashPassword, verifyAuth, requireAuth } from '@/lib/auth'
import { isValidEmail, isValidPassword } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        is_admin: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { username, email, password, is_admin } = body

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.users.create({
      data: {
        username,
        email,
        hashed_password: hashedPassword,
        is_active: true,
        is_admin: is_admin || false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        is_admin: true,
        created_at: true,
      }
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
