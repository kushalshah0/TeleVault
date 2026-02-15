/**
 * Storage endpoints - Get, Update, Delete by ID
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'
import { deleteMessageFromTelegram } from '@/lib/telegram'
import { serializeBigInt } from '@/lib/utils/serialize'

/**
 * GET /api/storages/:id - Get storage details
 */
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
        // ⚡ OPTIMIZATION: Only load root-level folders and files (limited for performance)
        // Client will fetch nested items on-demand
        folders: {
          where: { parent_id: null },
          orderBy: { name: 'asc' },
          take: 100, // Limit to first 100 folders
        },
        files: {
          where: { folder_id: null },
          orderBy: { created_at: 'desc' },
          take: 100, // Limit to first 100 files
        },
        _count: {
          select: {
            files: true,
            folders: true,
          }
        }
      }
    })

    if (!storage) {
      return NextResponse.json(
        { error: 'Storage not found' },
        { status: 404 }
      )
    }

    // Determine user's role
    const isOwner = storage.owner_id === user.userId
    const userPermission = storage.storage_permissions[0]
    const userRole = isOwner ? 'OWNER' : (userPermission?.role || 'VIEWER')

    // ⚡ OPTIMIZATION: Don't log view activity (too frequent, slows down response)
    // Only log important actions like create/delete

    return NextResponse.json({
      success: true,
      data: {
        ...serializeBigInt(storage),
        userRole
      }
    })

  } catch (error) {
    console.error('Get storage error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch storage' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/storages/:id - Update storage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const storageId = parseInt(id)
    const body = await request.json()

    // Check if user owns the storage
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

    // Update storage
    const updatedStorage = await prisma.storages.update({
      where: { id: storageId },
      data: {
        name: body.name || storage.name,
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

    // Log activity (async, don't wait)
    // Note: Using STORAGE_VIEW since STORAGE_UPDATE is not in the ActivityType enum
    prisma.activities.create({
      data: {
        user_id: user.userId,
        username: user.username,
        activity_type: 'STORAGE_VIEW',
        description: `Updated storage "${updatedStorage.name}"`,
        storage_name: updatedStorage.name,
      }
    }).catch(err => console.error('Failed to log activity:', err))

    return NextResponse.json({
      success: true,
      data: updatedStorage
    })

  } catch (error) {
    console.error('Update storage error:', error)
    return NextResponse.json(
      { error: 'Failed to update storage' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/storages/:id - Delete storage and all files
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const storageId = parseInt(id)

    // Check if user owns the storage
    const storage = await prisma.storages.findFirst({
      where: {
        id: storageId,
        owner_id: user.userId
      },
      include: {
        files: {
          include: {
            file_chunks: true
          }
        }
      }
    })

    if (!storage) {
      return NextResponse.json(
        { error: 'Storage not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete all file chunks from Telegram
    const deletePromises = storage.files.flatMap(file =>
      file.file_chunks.map(chunk =>
        deleteMessageFromTelegram(
          storage.telegram_channel_id,
          Number(chunk.telegram_message_id),
          chunk.telegram_bot_token_index
        ).catch(err => console.error(`Failed to delete chunk: ${err}`))
      )
    )

    await Promise.allSettled(deletePromises)

    // Log activity before deletion (do it async, don't wait)
    prisma.activities.create({
      data: {
        user_id: user.userId,
        username: user.username,
        activity_type: 'STORAGE_DELETE',
        description: `Deleted storage "${storage.name}"`,
        storage_name: storage.name,
      }
    }).catch(err => console.error('Failed to log activity:', err))

    // Delete storage (cascade will delete files, chunks, folders)
    await prisma.storages.delete({
      where: { id: storageId }
    })

    return NextResponse.json({
      success: true,
      message: 'Storage deleted successfully'
    })

  } catch (error) {
    console.error('Delete storage error:', error)
    return NextResponse.json(
      { error: 'Failed to delete storage' },
      { status: 500 }
    )
  }
}
