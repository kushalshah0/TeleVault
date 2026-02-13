/**
 * File endpoints - Get, Delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'
import { deleteMessageFromTelegram } from '@/lib/telegram'

/**
 * GET /api/files/:id - Get file metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const fileId = parseInt(id)

    const file = await prisma.files.findFirst({
      where: {
        id: fileId,
        storages: {
          OR: [
            { owner_id: user.userId },
            {
              storage_permissions: {
                some: { user_id: user.userId }
              }
            }
          ]
        }
      },
      include: {
        storages: true,
        folders: true,
        file_chunks: {
          orderBy: { chunk_index: 'asc' }
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: file
    })

  } catch (error) {
    console.error('Get file error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/files/:id - Update file (rename)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const fileId = parseInt(id)
    const body = await request.json()

    // Check permissions (owner or editor)
    const file = await prisma.files.findFirst({
      where: {
        id: fileId,
        storages: {
          OR: [
            { owner_id: user.userId },
            {
              storage_permissions: {
                some: {
                  user_id: user.userId,
                  role: { in: ['EDITOR', 'ADMIN'] }
                }
              }
            }
          ]
        }
      },
      include: {
        storages: true
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update file name
    const updatedFile = await prisma.files.update({
      where: { id: fileId },
      data: {
        name: body.name || file.name
      }
    })

    // Log activity (async, don't wait)
    prisma.activities.create({
      data: {
        user_id: user.userId,
        username: user.username,
        activity_type: 'FILE_RENAME',
        description: `Renamed file to "${updatedFile.name}"`,
        storage_id: file.storages.id,
        storage_name: file.storages.name,
        file_id: updatedFile.id,
        file_name: updatedFile.name,
      }
    }).catch(err => console.error('Failed to log activity:', err))

    return NextResponse.json({
      success: true,
      data: updatedFile
    })

  } catch (error) {
    console.error('Update file error:', error)
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/files/:id - Delete file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const fileId = parseInt(id)

    // Check permissions (owner or editor)
    const file = await prisma.files.findFirst({
      where: {
        id: fileId,
        storages: {
          OR: [
            { owner_id: user.userId },
            {
              storage_permissions: {
                some: {
                  user_id: user.userId,
                  role: { in: ['EDITOR', 'ADMIN'] }
                }
              }
            }
          ]
        }
      },
      include: {
        storages: true,
        file_chunks: true
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete chunks from Telegram
    const deletePromises = file.file_chunks.map(chunk =>
      deleteMessageFromTelegram(
        file.storages.telegram_channel_id,
        Number(chunk.telegram_message_id),
        chunk.telegram_bot_token_index
      ).catch(err => console.error(`Failed to delete chunk: ${err}`))
    )

    await Promise.allSettled(deletePromises)

    // Delete file from database (cascade will delete chunks)
    await prisma.files.delete({
      where: { id: fileId }
    })

    // Log activity
    await prisma.activities.create({
      data: {
        user_id: user.userId,
        username: user.username,
        activity_type: 'FILE_DELETE',
        description: `Deleted file "${file.name}"`,
        storage_id: file.storages.id,
        storage_name: file.storages.name,
        file_name: file.name,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
