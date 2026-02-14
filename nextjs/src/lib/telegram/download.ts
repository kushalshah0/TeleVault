/**
 * Telegram download operations
 */
import { botPool } from './bot-pool'

/**
 * Download a file chunk from Telegram
 */
export async function downloadChunkFromTelegram(
  fileId: string,
  botIndex: number
): Promise<Buffer> {
  try {
    const bot = botPool.getBot(botIndex)
    
    // Get file download link
    const fileUrl = await bot.getFileLink(fileId)
    
    // Download file
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Telegram download error:', error)
    throw new Error(`Failed to download chunk from Telegram: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Download multiple chunks in parallel and combine them
 */
export async function downloadFile(
  chunks: Array<{ fileId: string; botIndex: number; chunkIndex: number }>,
  concurrency: number = 5
): Promise<Buffer> {
  // Sort chunks by index
  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)
  
  const buffers: Buffer[] = []
  
  // Download in batches
  for (let i = 0; i < sortedChunks.length; i += concurrency) {
    const batch = sortedChunks.slice(i, i + concurrency)
    
    const batchBuffers = await Promise.all(
      batch.map(async (chunk, idx) => {
        const buffer = await downloadChunkFromTelegram(chunk.fileId, chunk.botIndex)
        return buffer
      })
    )
    buffers.push(...batchBuffers)
  }
  
  // Combine all buffers
  return Buffer.concat(buffers)
}

/**
 * Stream download for large files (downloads and yields chunks)
 */
export async function* downloadFileStream(
  chunks: Array<{ fileId: string; botIndex: number; chunkIndex: number }>,
  concurrency: number = 3
): AsyncGenerator<Buffer> {
  // Sort chunks by index
  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)
  
  // Download and yield in batches
  for (let i = 0; i < sortedChunks.length; i += concurrency) {
    const batch = sortedChunks.slice(i, i + concurrency)
    const batchBuffers = await Promise.all(
      batch.map(chunk => downloadChunkFromTelegram(chunk.fileId, chunk.botIndex))
    )
    
    for (const buffer of batchBuffers) {
      yield buffer
    }
  }
}
