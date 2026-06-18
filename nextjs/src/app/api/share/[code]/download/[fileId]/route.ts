import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { cleanupExpiredShares } from '@/lib/share-cleanup'
import { downloadChunkFromTelegram } from '@/lib/telegram'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; fileId: string }> }
) {
  try {
    const { code, fileId } = await params
    const fileIdNum = parseInt(fileId)
    if (isNaN(fileIdNum)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
    }

    await cleanupExpiredShares()

    const uploadCode = await prisma.upload_codes.findUnique({ where: { code } })
    if (!uploadCode || uploadCode.status !== 'active') {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    const now = new Date()
    if (uploadCode.expires_at && now > uploadCode.expires_at) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 410 })
    }

    if (uploadCode.max_downloads && uploadCode.download_count >= uploadCode.max_downloads) {
      return NextResponse.json({ error: 'Download limit reached' }, { status: 403 })
    }

    const passwordHeader = request.headers.get('x-password')
    if (uploadCode.password_hash) {
      if (!passwordHeader) {
        return NextResponse.json({ error: 'Password required' }, { status: 401 })
      }
      const { createHash } = await import('crypto')
      const hash = createHash('sha256').update(passwordHeader).digest('hex')
      if (hash !== uploadCode.password_hash) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }
    }

    const file = await prisma.code_files.findFirst({
      where: { id: fileIdNum, upload_code_id: uploadCode.id },
      include: {
        chunks: { orderBy: { chunk_index: 'asc' } }
      }
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await prisma.upload_codes.update({
      where: { id: uploadCode.id },
      data: { download_count: { increment: 1 } }
    })

    const safeFilename = file.name.replace(/[^\x00-\x7F]/g, '_')
    const utf8Filename = encodeURIComponent(file.name)
    const totalSize = Number(file.size)

    const BATCH_SIZE = 3

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chunks = file.chunks
          for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE)
            const buffers = await Promise.all(
              batch.map(chunk =>
                downloadChunkFromTelegram(chunk.telegram_file_id, chunk.telegram_bot_token_index)
              )
            )
            for (const buffer of buffers) {
              controller.enqueue(new Uint8Array(buffer))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${utf8Filename}`,
        'Content-Length': totalSize.toString(),
        'Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    console.error('Share download error:', error)
    if (error instanceof Response) return error
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}
