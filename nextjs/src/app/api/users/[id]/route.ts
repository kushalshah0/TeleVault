import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { verifyAuth } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request)
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = parseInt(id)
    const body = await request.json()
    const { username, email, password, is_active, is_admin } = body

    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (username || email) {
      const duplicateCheck = await prisma.users.findFirst({
        where: {
          id: { not: userId },
          OR: [
            username ? { username } : {},
            email ? { email } : {}
          ]
        }
      })

      if (duplicateCheck) {
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: any = {}
    if (username) updateData.username = username
    if (email) updateData.email = email
    if (is_active !== undefined) updateData.is_active = is_active
    if (is_admin !== undefined) updateData.is_admin = is_admin
    if (password) {
      updateData.hashed_password = await hashPassword(password)
    }

    const user = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        is_admin: true,
        created_at: true,
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request)
    if (!auth || !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const userId = parseInt(id)

    if (auth.userId === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.users.delete({
      where: { id: userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
