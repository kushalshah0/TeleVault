/**
 * Folder contents endpoint - Get files and subfolders in a specific folder
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'
import { serializeBigInt } from '@/lib/utils/serialize'

/**
 * GET /api/folders/:id/contents - Get folder contents (files and subfolders)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const folderId = parseInt(id)

    // Verify folder exists and user has access
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
      }
    })

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found or unauthorized' },
        { status: 404 }
      )
    }

    // Fetch files and subfolders in this folder (limited for performance)
    const [files, subfolders] = await Promise.all([
      prisma.files.findMany({
        where: { folder_id: folderId },
        orderBy: { created_at: 'desc' },
        take: 100, // Limit to 100 files per folder
      }),
      prisma.folders.findMany({
        where: { parent_id: folderId },
        orderBy: { name: 'asc' },
        take: 100, // Limit to 100 subfolders
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        files: serializeBigInt(files),
        folders: serializeBigInt(subfolders)
      }
    })

  } catch (error) {
    console.error('Get folder contents error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folder contents' },
      { status: 500 }
    )
  }
}
