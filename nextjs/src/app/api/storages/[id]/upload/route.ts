/**
 * File upload endpoint with client-side chunking support
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { requireAuth } from '@/lib/auth'
import { uploadChunkToTelegram } from '@/lib/telegram'

/**
 * POST /api/storages/:id/upload - Upload file chunk
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const storageId = parseInt(id)

    // Check storage access
    const storage = await prisma.storages.findFirst({
      where: {
        id: storageId,
        OR: [
          { owner_id: user.userId },
          {
            storage_permissions: {
              some: {
                user_id: user.userId,
                role: { in: ['EDITOR', 'ADMIN'] }
              }
            }
          }
        ]
      }
    })

    if (!storage) {
      return NextResponse.json(
        { error: 'Storage not found or unauthorized' },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const fileName = formData.get('fileName') as string
    const fileSize = parseInt(formData.get('fileSize') as string)
    const mimeType = formData.get('mimeType') as string | null
    const folderId = formData.get('folderId') ? parseInt(formData.get('folderId') as string) : null
    const fileId = formData.get('fileId') ? parseInt(formData.get('fileId') as string) : null

    // Validate required fields
    if (!chunk || chunkIndex === undefined || !totalChunks || !fileName || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await chunk.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload chunk to Telegram
    const chunkFileName = `${fileName}_chunk_${chunkIndex}`
    const telegramResult = await uploadChunkToTelegram(
      storage.telegram_channel_id,
      buffer,
      chunkFileName
    )

    // First chunk: Create file record
    let file
    if (chunkIndex === 0) {
      file = await prisma.files.create({
        data: {
          name: fileName,
          size: fileSize,
          mime_type: mimeType || chunk.type || null,
          storage_id: storageId,
          folder_id: folderId,
        }
      })

      // ⚡ OPTIMIZATION: Log activity async (don't slow down upload)
      prisma.activities.create({
        data: {
          user_id: user.userId,
          username: user.username,
          activity_type: 'FILE_UPLOAD',
          description: `Uploading file "${fileName}"`,
          storage_id: storage.id,
          storage_name: storage.name,
          file_id: file.id,
          file_name: file.name,
        }
      }).catch(err => console.error('Failed to log activity:', err))
    } else {
      // Subsequent chunks: Find existing file
      if (!fileId) {
        return NextResponse.json(
          { error: 'fileId required for chunks after the first' },
          { status: 400 }
        )
      }
      file = await prisma.files.findUnique({ where: { id: fileId } })
      if (!file) {
        return NextResponse.json(
          { error: 'File record not found' },
          { status: 404 }
        )
      }
    }

    // Save chunk metadata
    await prisma.file_chunks.create({
      data: {
        file_id: file.id,
        chunk_index: chunkIndex,
        chunk_size: buffer.length,
        telegram_message_id: telegramResult.messageId,
        telegram_file_id: telegramResult.fileId,
        telegram_bot_token_index: telegramResult.botIndex,
      }
    })

    const isComplete = chunkIndex === totalChunks - 1

    return NextResponse.json({
      success: true,
      data: {
        chunkIndex,
        totalChunks,
        file_id: file.id,
        isComplete,
        uploadedBytes: buffer.length,
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

// Increase body size limit for uploads (App Router config)
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for large uploads
