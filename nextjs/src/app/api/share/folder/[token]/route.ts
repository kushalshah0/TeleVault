import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { randomBytes } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // Get request body
    let body = {}
    try {
      body = await request.json()
    } catch {}

    const { password, path = '', item_ids, all } = body as { 
      password?: string
      path?: string
      item_ids?: number[]
      all?: boolean
    }

    // Find folder share
    const share = await prisma.folder_shares.findUnique({
      where: { token },
      include: {
        folders: {
          include: {
            storages: true
          }
        }
      }
    })

    if (!share) {
      return NextResponse.json(
        { error: 'Share link not found or expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (share.expires_at && new Date() > share.expires_at) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }

    // Check password
    if (share.password) {
      if (!password || password !== share.password) {
        return NextResponse.json(
          { error: 'Incorrect password', requires_password: true },
          { status: 401 }
        )
      }
    }

    // Check max downloads
    if (share.max_downloads && share.download_count >= share.max_downloads) {
      return NextResponse.json(
        { error: 'Maximum download limit reached for this share link' },
        { status: 403 }
      )
    }

    // Get user who created the share (for display)
    const creator = await prisma.users.findUnique({
      where: { id: share.created_by },
      select: { username: true }
    })

    // Get folder contents
    const folderPath = share.folders.path + (path ? '/' + path : '')
    
    // Find current folder
    const currentFolder = await prisma.folders.findFirst({
      where: {
        storage_id: share.folders.storage_id,
        path: folderPath
      }
    })

    if (!currentFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Get files in current folder
    const files = await prisma.files.findMany({
      where: { folder_id: currentFolder.id },
      select: {
        id: true,
        name: true,
        size: true,
        mime_type: true,
        created_at: true
      },
      orderBy: { name: 'asc' }
    })

    // Get subfolders in current folder
    const subfolders = await prisma.folders.findMany({
      where: { 
        parent_id: currentFolder.id 
      },
      select: {
        id: true,
        name: true,
        created_at: true
      },
      orderBy: { name: 'asc' }
    })

    // Combine items
    const items = [
      ...subfolders.map(f => ({
        id: f.id,
        name: f.name,
        type: 'folder' as const,
        modified_at: f.created_at
      })),
      ...files.map(f => ({
        id: f.id,
        name: f.name,
        type: 'file' as const,
        size: Number(f.size),
        mime_type: f.mime_type,
        modified_at: f.created_at
      }))
    ]

    return NextResponse.json({
      folder: {
        name: currentFolder.name,
        path: currentFolder.path,
        created_by: creator?.username || 'Unknown',
        created_at: share.created_at,
        expires_at: share.expires_at,
        max_downloads: share.max_downloads,
        download_count: share.download_count
      },
      items
    })

  } catch (error) {
    console.error('Folder share error:', error)
    return NextResponse.json(
      { error: 'Failed to access folder' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Find folder share
    const share = await prisma.folder_shares.findUnique({
      where: { token },
      include: {
        folders: true
      }
    })

    if (!share) {
      return NextResponse.json(
        { error: 'Share link not found or expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (share.expires_at && new Date() > share.expires_at) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }

    const hasPassword = !!share.password

    if (action === 'info') {
      // Get user who created the share
      const creator = await prisma.users.findUnique({
        where: { id: share.created_by },
        select: { username: true }
      })

      return NextResponse.json({
        name: share.folders.name,
        has_password: hasPassword,
        expires_at: share.expires_at,
        max_downloads: share.max_downloads,
        download_count: share.download_count,
        created_by: creator?.username,
        created_at: share.created_at
      })
    }

    // Default: return folder info
    return NextResponse.json({
      has_password: hasPassword
    })

  } catch (error) {
    console.error('Folder share info error:', error)
    return NextResponse.json(
      { error: 'Failed to get folder info' },
      { status: 500 }
    )
  }
}
