import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { z } from 'zod'

const passwordSchema = z.object({
  password: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    const fileShare = await prisma.file_shares.findUnique({
      where: { token },
      include: {
        files: {
          include: {
            file_chunks: {
              orderBy: { chunk_index: 'asc' }
            }
          }
        },
        users: {
          select: {
            username: true,
            email: true
          }
        }
      }
    })

    if (!fileShare) {
      return NextResponse.json(
        { error: 'Share link not found or has expired' },
        { status: 404 }
      )
    }

    if (fileShare.expires_at && new Date() > fileShare.expires_at) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }

    if (fileShare.max_downloads && fileShare.download_count >= fileShare.max_downloads) {
      return NextResponse.json(
        { error: 'Maximum download limit reached for this share link' },
        { status: 403 }
      )
    }

    const hasPassword = !!fileShare.password
    
    if (action === 'info') {
      return NextResponse.json({
        name: fileShare.files.name,
        size: Number(fileShare.files.size),
        mime_type: fileShare.files.mime_type,
        has_password: hasPassword,
        created_by: fileShare.users.username,
        created_at: fileShare.created_at,
        expires_at: fileShare.expires_at,
        max_downloads: fileShare.max_downloads,
        download_count: fileShare.download_count,
      })
    }

    return NextResponse.json(
      { error: 'Use POST to download file' },
      { status: 405 }
    )

  } catch (error) {
    console.error('Share download error:', error)
    return NextResponse.json(
      { error: 'Download failed. Please try again later.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { password } = body

    const fileShare = await prisma.file_shares.findUnique({
      where: { token },
      include: {
        files: {
          include: {
            file_chunks: {
              orderBy: { chunk_index: 'asc' }
            }
          }
        }
      }
    })

    if (!fileShare) {
      return NextResponse.json(
        { error: 'Share link not found or has expired' },
        { status: 404 }
      )
    }

    if (fileShare.expires_at && new Date() > fileShare.expires_at) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }

    if (fileShare.max_downloads && fileShare.download_count >= fileShare.max_downloads) {
      return NextResponse.json(
        { error: 'Maximum download limit reached for this share link' },
        { status: 403 }
      )
    }

    const hasPassword = !!fileShare.password
    
    if (hasPassword) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password required', requires_password: true },
          { status: 401 }
        )
      }

      if (password !== fileShare.password) {
        return NextResponse.json(
          { error: 'Incorrect password', requires_password: true },
          { status: 401 }
        )
      }
    }

    await prisma.file_shares.update({
      where: { id: fileShare.id },
      data: { download_count: { increment: 1 } }
    })

    const file = fileShare.files
    
    if (!file || !file.file_chunks.length) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const chunks = file.file_chunks.map(chunk => ({
      fileId: chunk.telegram_file_id,
      botIndex: chunk.telegram_bot_token_index,
      chunkIndex: chunk.chunk_index,
    }))

    const { downloadFile } = await import('@/lib/telegram')
    const fileBuffer = await downloadFile(chunks, 3)

    const safeFilename = file.name.replace(/[^\x00-\x7F]/g, '_')
    const utf8Filename = encodeURIComponent(file.name)

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${utf8Filename}`,
        'Content-Length': fileBuffer.length.toString(),
      }
    })

  } catch (error) {
    console.error('Share download error:', error)
    return NextResponse.json(
      { error: 'Download failed. Please try again later.' },
      { status: 500 }
    )
  }
}
