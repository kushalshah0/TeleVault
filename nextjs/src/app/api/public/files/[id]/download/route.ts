import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { serializeBigInt } from '@/lib/utils/serialize'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const fileId = parseInt(id)

    const file = await prisma.files.findUnique({
      where: { id: fileId },
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
    console.error('Public download error:', error)
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}
