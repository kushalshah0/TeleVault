/**
 * Storage endpoints - List and Create
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/storages - List all storages for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Get storages owned by user or shared with user
    const storages = await prisma.storages.findMany({
      where: {
        OR: [
          { owner_id: user.userId },
          {
            storage_permissions: {
              some: { user_id: user.userId }
            }
          }
        ]
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        },
        storage_permissions: {
          where: { user_id: user.userId },
          select: { role: true }
        },
        _count: {
          select: {
            files: true,
            folders: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Add userRole to each storage
    const storagesWithRole = storages.map(storage => {
      const isOwner = storage.owner_id === user.userId
      const userPermission = storage.storage_permissions[0]
      return {
        ...storage,
        userRole: isOwner ? 'OWNER' : (userPermission?.role || 'VIEWER')
      }
    })

    return NextResponse.json({
      success: true,
      data: storagesWithRole
    })

  } catch (error) {
    console.error('Get storages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch storages' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/storages - Create new storage
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { name, telegramChannelId } = body

    // Validate input
    if (!name || !telegramChannelId) {
      return NextResponse.json(
        { error: 'Name and Telegram channel ID are required' },
        { status: 400 }
      )
    }

    // Check if channel ID already exists
    const existingStorage = await prisma.storages.findUnique({
      where: { telegram_channel_id: telegramChannelId }
    })

    if (existingStorage) {
      return NextResponse.json(
        { error: 'Telegram channel already in use' },
        { status: 409 }
      )
    }

    // Create storage
    const storage = await prisma.storages.create({
      data: {
        name,
        telegram_channel_id: telegramChannelId,
        owner_id: user.userId,
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      }
    })

    // Log activity
    await prisma.activities.create({
      data: {
        user_id: user.userId,
        username: user.username,
        activity_type: 'STORAGE_CREATE',
        description: `Created storage "${name}"`,
        storage_id: storage.id,
        storage_name: storage.name,
      }
    })

    return NextResponse.json({
      success: true,
      data: storage
    }, { status: 201 })

  } catch (error) {
    console.error('Create storage error:', error)
    return NextResponse.json(
      { error: 'Failed to create storage' },
      { status: 500 }
    )
  }
}
