/**
 * Folder endpoints - List and Create
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'

/**
 * POST /api/folders - Create new folder
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { name, storageId, parentId } = body

    // Validate input
    if (!name || !storageId) {
      return NextResponse.json(
        { error: 'Name and storageId are required' },
        { status: 400 }
      )
    }

    // Convert storageId and parentId to integers
    const storageIdInt = parseInt(storageId)
    const parentIdInt = parentId ? parseInt(parentId) : null

    // Check storage access
    const storage = await prisma.storages.findFirst({
      where: {
        id: storageIdInt,
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
    })

    if (!storage) {
      return NextResponse.json(
        { error: 'Storage not found or unauthorized' },
        { status: 404 }
      )
    }

    // Build path
    let path = `/${name}`
    if (parentIdInt) {
      const parent = await prisma.folders.findUnique({
        where: { id: parentIdInt }
      })
      if (parent) {
        path = `${parent.path}/${name}`
      }
    }

    // Create folder
    const folder = await prisma.folders.create({
      data: {
        name,
        path,
        storage_id: storageIdInt,
        parent_id: parentIdInt,
      }
    })

    // Log activity
    await prisma.activities.create({
      data: {
        user_id: user.userId,
        username: user.username,
        activity_type: 'FOLDER_CREATE',
        description: `Created folder "${name}"`,
        storage_id: storage.id,
        storage_name: storage.name,
        folder_id: folder.id,
        folder_name: folder.name,
      }
    })

    return NextResponse.json({
      success: true,
      data: folder
    }, { status: 201 })

  } catch (error) {
    console.error('Create folder error:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}
