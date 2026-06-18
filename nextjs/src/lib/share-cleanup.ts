import { prisma } from './prisma/db'
import { deleteMessageFromTelegram } from './telegram'

const channelId = process.env.TELEGRAM_TEMP_CHANNEL_ID

export async function cleanupExpiredShares(): Promise<void> {
  if (!channelId) return

  const expired = await prisma.upload_codes.findMany({
    where: {
      status: 'active',
      expires_at: { lte: new Date() }
    },
    include: {
      files: {
        include: {
          chunks: true
        }
      }
    }
  })

  if (expired.length === 0) return

  for (const upload of expired) {
    const deletePromises = upload.files.flatMap(file =>
      file.chunks
        .filter(chunk => chunk.telegram_message_id)
        .map(chunk =>
          deleteMessageFromTelegram(
            channelId,
            Number(chunk.telegram_message_id),
            chunk.telegram_bot_token_index
          ).catch(() => {})
        )
    )

    await Promise.allSettled(deletePromises)

    await prisma.upload_codes.delete({ where: { id: upload.id } })
  }
}
