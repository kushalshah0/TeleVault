import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    let body = {}
    try {
      body = await request.json()
    } catch {}

    const { password, file_id } = body as { 
      password?: string
      file_id?: number
    }

    if (!file_id) {
      return NextResponse.json(
        { error: 'File ID is required for direct download' },
        { status: 400 }
      )
    }

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

    // Find the file in the shared folder or its subfolders
    const file = await prisma.files.findFirst({
      where: { 
        id: file_id,
        folders: {
          storage_id: share.folders.storage_id,
          path: { startsWith: share.folders.path }
        }
      },
      include: {
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

    // Increment download count
    await prisma.folder_shares.update({
      where: { id: share.id },
      data: { download_count: { increment: 1 } }
    })

    // Download file directly (no zip)
    const { downloadFile } = await import('@/lib/telegram')
    const chunkData = file.file_chunks.map(c => ({
      fileId: c.telegram_file_id,
      botIndex: c.telegram_bot_token_index,
      chunkIndex: c.chunk_index
    }))
    
    const fileBuffer = await downloadFile(chunkData, 3)

    // Return the file directly
    const headers = new Headers()
    headers.set('Content-Type', file.mime_type || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`)
    headers.set('Content-Length', fileBuffer.length.toString())
    
    return new NextResponse(new Uint8Array(fileBuffer), { headers })

  } catch (error) {
    console.error('Direct file download error:', error)
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}
