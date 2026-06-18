import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const uploadCode = await prisma.upload_codes.findUnique({
      where: { code },
      include: {
        files: {
          orderBy: { id: 'asc' }
        }
      }
    })

    if (!uploadCode) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 404 })
    }

    if (uploadCode.status !== 'active') {
      return NextResponse.json({ error: 'Share is no longer available' }, { status: 410 })
    }

    const now = new Date()
    if (uploadCode.expires_at && now > uploadCode.expires_at) {
      await prisma.upload_codes.update({
        where: { id: uploadCode.id },
        data: { status: 'expired' }
      })
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 })
    }

    if (uploadCode.max_downloads && uploadCode.download_count >= uploadCode.max_downloads) {
      return NextResponse.json({
        error: 'Download limit reached',
        limit_reached: true
      }, { status: 403 })
    }

    const totalSize = Number(uploadCode.total_size)

    return NextResponse.json({
      has_password: !!uploadCode.password_hash,
      expires_at: uploadCode.expires_at?.toISOString() || null,
      max_downloads: uploadCode.max_downloads,
      download_count: uploadCode.download_count,
      total_size: totalSize,
      created_at: uploadCode.created_at.toISOString(),
      files: uploadCode.files.map(f => ({
        id: f.id,
        name: f.name,
        size: Number(f.size),
        mime_type: f.mime_type,
      }))
    })
  } catch (error) {
    console.error('Share info error:', error)
    return NextResponse.json(
      { error: 'Failed to load share info' },
      { status: 500 }
    )
  }
}
