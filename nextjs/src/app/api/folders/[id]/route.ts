/**
 * Folder endpoints - Get, Delete by ID
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'
import { deleteMessageFromTelegram } from '@/lib/telegram'

/**
 * GET /api/folders/:id - Get folder contents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const folderId = parseInt(id)

    const folder = await prisma.folders.findFirst({
      where: {
        id: folderId,
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
        other_folders: {
          orderBy: { name: 'asc' }
        },
        files: {
          orderBy: { created_at: 'desc' }
        }
      }
    })

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: folder
    })

  } catch (error) {
    console.error('Get folder error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/folders/:id - Rename folder
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const folderId = parseInt(id)
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check permissions
    const folder = await prisma.folders.findFirst({
      where: {
        id: folderId,
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
      }
    })

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update folder name
    const updatedFolder = await prisma.folders.update({
      where: { id: folderId },
      data: { name: body.name }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedFolder,
        id: Number(updatedFolder.id),
        storage_id: Number(updatedFolder.storage_id),
        parent_id: updatedFolder.parent_id ? Number(updatedFolder.parent_id) : null,
      }
    })

  } catch (error) {
    console.error('Rename folder error:', error)
    return NextResponse.json(
      { error: 'Failed to rename folder' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/folders/:id - Delete folder and contents
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const folderId = parseInt(id)

    // Check permissions
    const folder = await prisma.folders.findFirst({
      where: {
        id: folderId,
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
        files: {
          include: {
            file_chunks: true
          }
        }
      }
    })

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete all file chunks from Telegram
    const deletePromises = folder.files.flatMap(file =>
      file.file_chunks.map(chunk =>
        deleteMessageFromTelegram(
          folder.storages.telegram_channel_id,
          Number(chunk.telegram_message_id),
          chunk.telegram_bot_token_index
        ).catch(err => console.error(`Failed to delete chunk: ${err}`))
      )
    )

    await Promise.allSettled(deletePromises)

    // Delete folder (cascade will delete files and subfolders)
    await prisma.folders.delete({
      where: { id: folderId }
    })

    // Log activity
    await prisma.activities.create({
      data: {
        user_id: user.userId,
        username: user.username,
        activity_type: 'FOLDER_DELETE',
        description: `Deleted folder "${folder.name}"`,
        storage_id: folder.storages.id,
        storage_name: folder.storages.name,
        folder_name: folder.name,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully'
    })

  } catch (error) {
    console.error('Delete folder error:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}
