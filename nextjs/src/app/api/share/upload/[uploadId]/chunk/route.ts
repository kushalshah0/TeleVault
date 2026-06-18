import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { uploadChunkToTelegram } from '@/lib/telegram'

const MAX_TOTAL_SIZE = 50 * 1024 * 1024
const MAX_CHUNK_SIZE = 5 * 1024 * 1024

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params
    const id = parseInt(uploadId)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid upload ID' }, { status: 400 })
    }

    const channelId = process.env.TELEGRAM_TEMP_CHANNEL_ID
    if (!channelId) {
      return NextResponse.json(
        { error: 'TELEGRAM_TEMP_CHANNEL_ID not configured' },
        { status: 500 }
      )
    }

    const uploadCode = await prisma.upload_codes.findUnique({ where: { id } })
    if (!uploadCode) {
      return NextResponse.json({ error: 'Upload session not found' }, { status: 404 })
    }
    if (uploadCode.status !== 'pending') {
      return NextResponse.json({ error: 'Upload session already finalized' }, { status: 400 })
    }

    const formData = await request.formData()
    const chunkFile = formData.get('file') as File | null
    const fileName = formData.get('fileName') as string | null
    const fileIndexStr = formData.get('fileIndex') as string | null
    const chunkIndexStr = formData.get('chunkIndex') as string | null
    const totalChunksStr = formData.get('totalChunks') as string | null
    const mimeType = formData.get('mimeType') as string | null

    if (!chunkFile || !fileName || fileIndexStr === null || chunkIndexStr === null || totalChunksStr === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const fileIndex = parseInt(fileIndexStr)
    const chunkIndex = parseInt(chunkIndexStr)
    const totalChunks = parseInt(totalChunksStr)

    if (chunkFile.size > MAX_CHUNK_SIZE) {
      return NextResponse.json({ error: 'Chunk too large' }, { status: 400 })
    }

    if (uploadCode.total_size + BigInt(chunkFile.size) > BigInt(MAX_TOTAL_SIZE)) {
      return NextResponse.json({ error: 'Total upload size exceeds 50 MB limit' }, { status: 400 })
    }

    const buffer = Buffer.from(await chunkFile.arrayBuffer())
    const telegramName = `${fileName}_chunk_${chunkIndex}`

    const result = await uploadChunkToTelegram(channelId, buffer, telegramName)

    let codeFile = await prisma.code_files.findFirst({
      where: { upload_code_id: id, name: fileName }
    })

    if (!codeFile) {
      const fileCount = await prisma.code_files.count({ where: { upload_code_id: id } })
      if (fileCount >= 10) {
        return NextResponse.json({ error: 'Maximum 10 files per share' }, { status: 400 })
      }

      codeFile = await prisma.code_files.create({
        data: {
          upload_code_id: id,
          name: fileName,
          mime_type: mimeType || null,
          size: 0,
          chunk_count: totalChunks
        }
      })
    }

    await prisma.code_file_chunks.create({
      data: {
        code_file_id: codeFile.id,
        chunk_index: chunkIndex,
        telegram_file_id: result.fileId,
        telegram_bot_token_index: result.botIndex
      }
    })

    await prisma.code_files.update({
      where: { id: codeFile.id },
      data: { size: { increment: BigInt(chunkFile.size) } }
    })

    await prisma.upload_codes.update({
      where: { id },
      data: { total_size: { increment: BigInt(chunkFile.size) } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload chunk error:', error)
    return NextResponse.json(
      { error: 'Failed to upload chunk' },
      { status: 500 }
    )
  }
}
