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
    const fileId = parseInt(id)

    const body = await request.json()
    const validation = shareSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { expires_in_days, max_downloads, password } = validation.data

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
      include: { storages: true }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      )
    }

    const token = randomBytes(8).toString('hex')
    const expires_at = expires_in_days 
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : null

    const fileShare = await prisma.file_shares.create({
      data: {
        file_id: fileId,
        token,
        expires_at,
        max_downloads,
        password: password || null,
        created_by: user.userId
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.origin}`
    const shareUrl = `${baseUrl}/share/${token}`

    return NextResponse.json({
      share_url: shareUrl,
      expires_at: expires_at,
      max_downloads,
      created_at: fileShare.created_at
    })

  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.json(
      { error: 'Failed to create share link' },
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
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      )
    }

    const shares = await prisma.file_shares.findMany({
      where: {
        file_id: fileId,
      },
      orderBy: { created_at: 'desc' }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return NextResponse.json(shares.map(share => ({
      id: share.id,
      share_url: `${baseUrl}/share/${share.token}`,
      expires_at: share.expires_at,
      max_downloads: share.max_downloads,
      download_count: share.download_count,
      created_at: share.created_at,
      is_expired: share.expires_at ? new Date() > share.expires_at : false
    })))

  } catch (error) {
    console.error('List shares error:', error)
    return NextResponse.json(
      { error: 'Failed to list share links' },
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
    const url = new URL(request.url)
    const shareId = url.searchParams.get('share_id')

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      )
    }

    const share = await prisma.file_shares.findFirst({
      where: {
        id: parseInt(shareId),
        created_by: user.userId
      }
    })

    if (!share) {
      return NextResponse.json(
        { error: 'Share link not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.file_shares.delete({
      where: { id: share.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete share error:', error)
    return NextResponse.json(
      { error: 'Failed to delete share link' },
      { status: 500 }
    )
  }
}
