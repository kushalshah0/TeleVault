/**
 * Telegram upload operations
 */
import { botPool } from './bot-pool'
import { Readable } from 'stream'

export interface TelegramUploadResult {
  messageId: number
  fileId: string
  botIndex: number
}

/**
 * Upload a file chunk to Telegram channel with retry logic
 */
export async function uploadChunkToTelegram(
  channelId: string,
  chunk: Buffer,
  fileName: string,
  retries: number = 3
): Promise<TelegramUploadResult> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { bot, index } = botPool.getNextBot()

      // Convert Buffer to Stream for Telegram API
      // Note: We need to provide the stream as a proper file object for filename to work
      const stream = Readable.from(chunk)

      // Upload document to channel with proper filename
      // The filename property needs to be on the stream itself for node-telegram-bot-api
      const fileStream = Object.assign(stream, { path: fileName })

      const message = await bot.sendDocument(channelId, fileStream)

      if (!message.document) {
        throw new Error('Failed to upload document to Telegram')
      }

      return {
        messageId: message.message_id,
        fileId: message.document.file_id,
        botIndex: index,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.error(`Telegram upload error (attempt ${attempt + 1}/${retries}):`, lastError)

      // If connection reset or network error, wait before retry
      if (attempt < retries - 1) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000) // Exponential backoff, max 5s
        console.log(`Retrying upload in ${backoffMs}ms...`)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }
    }
  }

  throw new Error(`Failed to upload chunk to Telegram after ${retries} attempts: ${lastError?.message || 'Unknown error'}`)
}

/**
 * Delete a message from Telegram channel
 */
export async function deleteMessageFromTelegram(
  channelId: string,
  messageId: number,
  botIndex: number
): Promise<void> {
  try {
    const bot = botPool.getBot(botIndex)
    await bot.deleteMessage(channelId, Number(messageId))
  } catch (error) {
    console.error('Telegram delete error:', error)
    // Don't throw - message might already be deleted
  }
}

/**
 * Upload multiple chunks in parallel
 */
export async function uploadChunksParallel(
  channelId: string,
  chunks: Buffer[],
  baseFileName: string,
  concurrency: number = 5
): Promise<TelegramUploadResult[]> {
  const results: TelegramUploadResult[] = []

  // Upload in batches
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((chunk, index) => {
        const chunkIndex = i + index
        const fileName = `${baseFileName}_chunk_${chunkIndex}`
        return uploadChunkToTelegram(channelId, chunk, fileName)
      })
    )
    results.push(...batchResults)
  }

  return results
}
