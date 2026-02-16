import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const shareSchema = z.object({
  expires_in_days: z.number().min(1).max(365).optional(),
  max_downloads: z.number().min(1).max(1000).optional(),
  password: z.string().min(4).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const folderId = parseInt(id)

    const body = await request.json()
    const validation = shareSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { expires_in_days, max_downloads, password } = validation.data

    // Check if user has access to the folder
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
      include: { storages: true }
    })

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      )
    }

    // Check if share link already exists for this folder
    const existingShare = await prisma.folder_shares.findFirst({
      where: { folder_id: folderId }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.origin}`

    if (existingShare) {
      // Update existing share link
      const expires_at = expires_in_days 
        ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
        : null

      const updatedShare = await prisma.folder_shares.update({
        where: { id: existingShare.id },
        data: {
          expires_at,
          max_downloads,
          password: password || null,
        }
      })

      return NextResponse.json({
        share_url: `${baseUrl}/share/folder/${updatedShare.token}`,
        expires_at: updatedShare.expires_at,
        max_downloads: updatedShare.max_downloads,
        created_at: updatedShare.created_at,
        updated: true
      })
    }

    // Create new share link
    const token = randomBytes(8).toString('hex')
    const expires_at = expires_in_days 
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : null

    const folderShare = await prisma.folder_shares.create({
      data: {
        folder_id: folderId,
        token,
        expires_at,
        max_downloads,
        password: password || null,
        created_by: user.userId
      }
    })

    return NextResponse.json({
      share_url: `${baseUrl}/share/folder/${token}`,
      expires_at: expires_at,
      max_downloads,
      created_at: folderShare.created_at,
      updated: false
    })

  } catch (error) {
    console.error('Folder share error:', error)
    return NextResponse.json(
      { error: 'Failed to create folder share link' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const folderId = parseInt(id)

    // Check if user has access to the folder
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
        { error: 'Folder not found or access denied' },
        { status: 404 }
      )
    }

    // Get share link for this folder
    const share = await prisma.folder_shares.findFirst({
      where: { folder_id: folderId },
      orderBy: { created_at: 'desc' }
    })

    if (!share) {
      return NextResponse.json(null)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return NextResponse.json({
      id: share.id,
      share_url: `${baseUrl}/share/folder/${share.token}`,
      expires_at: share.expires_at,
      max_downloads: share.max_downloads,
      download_count: share.download_count,
      created_at: share.created_at,
      is_expired: share.expires_at ? new Date() > share.expires_at : false,
      password: share.password
    })

  } catch (error) {
    console.error('Get folder share error:', error)
    return NextResponse.json(
      { error: 'Failed to get folder share link' },
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
    const folderId = parseInt(id)

    // Check if user has access to the folder
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
        { error: 'Folder not found or access denied' },
        { status: 404 }
      )
    }

    const share = await prisma.folder_shares.findFirst({
      where: { folder_id: folderId }
    })

    if (!share) {
      return NextResponse.json(
        { error: 'No share link to delete' },
        { status: 404 }
      )
    }

    // Only creator or admin can delete
    if (!user.isAdmin && share.created_by !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own share link' },
        { status: 403 }
      )
    }

    await prisma.folder_shares.delete({
      where: { id: share.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete folder share error:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder share link' },
      { status: 500 }
    )
  }
}
