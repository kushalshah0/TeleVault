import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['viewer', 'editor', 'admin']).optional().default('viewer')
})

const updateRoleSchema = z.object({
  user_id: z.number(),
  role: z.enum(['viewer', 'editor', 'admin'])
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const storageId = parseInt(id)

    const storage = await prisma.storages.findFirst({
      where: {
        id: storageId,
        owner_id: user.userId
      }
    })

    if (!storage) {
      return NextResponse.json(
        { error: 'Storage not found or unauthorized' },
        { status: 404 }
      )
    }

    const permissions = await prisma.storage_permissions.findMany({
      where: { storage_id: storageId },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { granted_at: 'desc' }
    })

    return NextResponse.json(permissions.map(p => ({
      id: p.id,
      user_id: p.user_id,
      username: p.users.username,
      email: p.users.email,
      role: p.role.toLowerCase(),
      granted_at: p.granted_at
    })))

  } catch (error) {
    console.error('Get permissions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const storageId = parseInt(id)

    const body = await request.json()
    const validation = inviteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { email, role } = validation.data

    const storage = await prisma.storages.findFirst({
      where: {
        id: storageId,
        owner_id: user.userId
      }
    })

    if (!storage) {
      return NextResponse.json(
        { error: 'Storage not found or unauthorized' },
        { status: 404 }
      )
    }

    const targetUser = await prisma.users.findUnique({
      where: { email }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found with this email' },
        { status: 404 }
      )
    }

    if (targetUser.id === user.userId) {
      return NextResponse.json(
        { error: 'You are already the owner of this storage' },
        { status: 400 }
      )
    }

    const existingPermission = await prisma.storage_permissions.findUnique({
      where: {
        storage_id_user_id: {
          storage_id: storageId,
          user_id: targetUser.id
        }
      }
    })

    if (existingPermission) {
      return NextResponse.json(
        { error: 'User already has access to this storage' },
        { status: 400 }
      )
    }

    const UserRole = role.toUpperCase() as 'VIEWER' | 'EDITOR' | 'ADMIN'
    
    const permission = await prisma.storage_permissions.create({
      data: {
        storage_id: storageId,
        user_id: targetUser.id,
        role: UserRole
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      id: permission.id,
      user_id: permission.user_id,
      username: permission.users.username,
      email: permission.users.email,
      role: permission.role.toLowerCase(),
      granted_at: permission.granted_at
    })

  } catch (error) {
    console.error('Invite member error:', error)
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const storageId = parseInt(id)

    const body = await request.json()
    const validation = updateRoleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { user_id, role } = validation.data

    const storage = await prisma.storages.findFirst({
      where: {
        id: storageId,
        owner_id: user.userId
      }
    })

    if (!storage) {
      return NextResponse.json(
        { error: 'Storage not found or unauthorized' },
        { status: 404 }
      )
    }

    const permission = await prisma.storage_permissions.findUnique({
      where: {
        storage_id_user_id: {
          storage_id: storageId,
          user_id
        }
      }
    })

    if (!permission) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    const UserRole = role.toUpperCase() as 'VIEWER' | 'EDITOR' | 'ADMIN'
    
    const updated = await prisma.storage_permissions.update({
      where: { id: permission.id },
      data: { role: UserRole },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      id: updated.id,
      user_id: updated.user_id,
      username: updated.users.username,
      email: updated.users.email,
      role: updated.role.toLowerCase(),
      granted_at: updated.granted_at
    })

  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const storageId = parseInt(id)
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const parsedUserId = parseInt(userId)

    const storage = await prisma.storages.findFirst({
      where: {
        id: storageId,
        owner_id: user.userId
      }
    })

    if (!storage) {
      return NextResponse.json(
        { error: 'Storage not found or unauthorized' },
        { status: 404 }
      )
    }

    const permission = await prisma.storage_permissions.findUnique({
      where: {
        storage_id_user_id: {
          storage_id: storageId,
          user_id: parsedUserId
        }
      }
    })

    if (!permission) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    await prisma.storage_permissions.delete({
      where: { id: permission.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
