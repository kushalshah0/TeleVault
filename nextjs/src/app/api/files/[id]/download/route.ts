/**
 * File download endpoint with streaming support
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'
import { downloadFileStream } from '@/lib/telegram'

/**
 * GET /api/files/:id/download - Download file with streaming
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const fileId = parseInt(id)

    // Get file with chunks
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

    // ⚡ OPTIMIZATION: Log activity async (don't wait, don't slow down download)
    prisma.activities.create({
      data: {
        user_id: user.userId,
        username: user.username,
        activity_type: 'FILE_DOWNLOAD',
        description: `Downloaded file "${file.name}"`,
        storage_id: file.storages.id,
        storage_name: file.storages.name,
        file_id: file.id,
        file_name: file.name,
      }
    }).catch(err => console.error('Failed to log activity:', err))

    // Prepare chunks for download
    const chunks = file.file_chunks.map(chunk => ({
      fileId: chunk.telegram_file_id,
      botIndex: chunk.telegram_bot_token_index,
      chunkIndex: chunk.chunk_index,
    }))

    // Download all chunks and combine (simpler approach)
    const { downloadFile } = await import('@/lib/telegram')
    const fileBuffer = await downloadFile(chunks, 3)

    // Return file as buffer
    // Use proper Content-Disposition format with both ASCII fallback and UTF-8 filename
    const safeFilename = file.name.replace(/[^\x00-\x7F]/g, '_') // ASCII fallback
    const utf8Filename = encodeURIComponent(file.name)

    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${utf8Filename}`,
        'Content-Length': fileBuffer.length.toString(),
      }
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}
