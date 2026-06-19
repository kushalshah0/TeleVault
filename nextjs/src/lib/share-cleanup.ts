import { prisma } from './prisma/db'
import { deleteMessageFromTelegram } from './telegram'

const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000
const CLEANUP_COOLDOWN_MS = 60 * 60 * 1000

export async function cleanupExpiredShares({ force }: { force?: boolean } = {}): Promise<void> {
  const channelId = process.env.TELEGRAM_TEMP_CHANNEL_ID

  if (!channelId) {
    console.warn('[cleanup] TELEGRAM_TEMP_CHANNEL_ID not configured — skipping')
    return
  }

  const now = new Date()

  if (!force) {
    const lastRun = await prisma.cleanup_meta.findUnique({ where: { key: 'last_cleanup_at' } })
    if (lastRun) {
      const elapsed = now.getTime() - new Date(lastRun.value).getTime()
      if (elapsed < CLEANUP_COOLDOWN_MS) return
    }
  }

  const expired = await prisma.upload_codes.findMany({
    where: {
      OR: [
        { status: 'active', expires_at: { lte: now } },
        { status: 'pending', created_at: { lte: new Date(now.getTime() - STALE_UPLOAD_MS) } },
      ],
    },
    include: {
      files: {
        include: { chunks: true },
      },
    },
  })

  if (expired.length === 0) {
    await prisma.cleanup_meta.upsert({
      where: { key: 'last_cleanup_at' },
      update: { value: now.toISOString() },
      create: { key: 'last_cleanup_at', value: now.toISOString() },
    })
    return
  }

  console.log(`[cleanup] cleaning ${expired.length} expired uploads`)

  for (const upload of expired) {
    const deletePromises = upload.files.flatMap(file =>
      file.chunks
        .filter(chunk => chunk.telegram_message_id)
        .map(chunk =>
          deleteMessageFromTelegram(
            channelId,
            Number(chunk.telegram_message_id),
            chunk.telegram_bot_token_index,
          ).catch(err => console.error(`[cleanup] failed to delete telegram message ${chunk.telegram_message_id}:`, err))
        )
    )

    await Promise.allSettled(deletePromises)
    await prisma.upload_codes.delete({ where: { id: upload.id } })
    console.log(`[cleanup] deleted upload ${upload.id} (${upload.code})`)
  }

  await prisma.cleanup_meta.upsert({
    where: { key: 'last_cleanup_at' },
    update: { value: now.toISOString() },
    create: { key: 'last_cleanup_at', value: now.toISOString() },
  })
}
