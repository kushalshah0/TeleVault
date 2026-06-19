import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindMany = vi.fn()
const mockDelete = vi.fn()
const mockMetaFindUnique = vi.fn()
const mockMetaUpsert = vi.fn()
const mockDeleteMessage = vi.fn()

vi.mock('@/lib/prisma/db', () => ({
  prisma: {
    upload_codes: {
      findMany: mockFindMany,
      delete: mockDelete,
    },
    cleanup_meta: {
      findUnique: mockMetaFindUnique,
      upsert: mockMetaUpsert,
    },
  },
}))

vi.mock('@/lib/telegram', () => ({
  deleteMessageFromTelegram: mockDeleteMessage,
}))

const { cleanupExpiredShares } = await import('../share-cleanup')

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.TELEGRAM_TEMP_CHANNEL_ID
  mockMetaFindUnique.mockResolvedValue(null)
  mockMetaUpsert.mockResolvedValue({})
})

describe('cleanupExpiredShares', () => {
  it('logs warning and returns early when TELEGRAM_TEMP_CHANNEL_ID is not set', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await cleanupExpiredShares()

    expect(warn).toHaveBeenCalledWith(
      '[cleanup] TELEGRAM_TEMP_CHANNEL_ID not configured — skipping',
    )
    expect(mockFindMany).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('skips cleanup when last run was less than 1 hour ago', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    mockMetaFindUnique.mockResolvedValue({
      key: 'last_cleanup_at',
      value: new Date().toISOString(),
    })

    await cleanupExpiredShares()

    expect(mockFindMany).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('runs cleanup when forced even if recently ran', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    mockMetaFindUnique.mockResolvedValue({
      key: 'last_cleanup_at',
      value: new Date().toISOString(),
    })
    mockFindMany.mockResolvedValue([])
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    await cleanupExpiredShares({ force: true })

    expect(mockFindMany).toHaveBeenCalledOnce()
    log.mockRestore()
  })

  it('updates last_cleanup_at when no expired uploads exist', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    mockFindMany.mockResolvedValue([])

    await cleanupExpiredShares()

    expect(mockMetaUpsert).toHaveBeenCalledWith({
      where: { key: 'last_cleanup_at' },
      update: expect.any(Object),
      create: { key: 'last_cleanup_at', value: expect.any(String) },
    })
  })

  it('deletes Telegram messages and DB records for expired active uploads', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    const upload = {
      id: 1,
      code: 'ABC123',
      status: 'active',
      files: [
        {
          id: 10,
          chunks: [
            { id: 100, telegram_message_id: 500n, telegram_bot_token_index: 0 },
            { id: 101, telegram_message_id: 501n, telegram_bot_token_index: 1 },
          ],
        },
      ],
    }
    mockFindMany.mockResolvedValue([upload])
    mockDeleteMessage.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue(upload)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    await cleanupExpiredShares()

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(mockDeleteMessage).toHaveBeenCalledTimes(2)
    expect(mockDeleteMessage).toHaveBeenCalledWith('-1001234567890', 500, 0)
    expect(mockDeleteMessage).toHaveBeenCalledWith('-1001234567890', 501, 1)
    expect(mockMetaUpsert).toHaveBeenCalledOnce()
    log.mockRestore()
  })

  it('skips chunks with null telegram_message_id', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    const upload = {
      id: 2,
      code: 'DEF456',
      status: 'active',
      files: [
        {
          id: 20,
          chunks: [
            { id: 200, telegram_message_id: null, telegram_bot_token_index: 0 },
            { id: 201, telegram_message_id: 600n, telegram_bot_token_index: 1 },
          ],
        },
      ],
    }
    mockFindMany.mockResolvedValue([upload])
    mockDelete.mockResolvedValue(upload)

    await cleanupExpiredShares()

    expect(mockDeleteMessage).toHaveBeenCalledTimes(1)
    expect(mockDeleteMessage).toHaveBeenCalledWith('-1001234567890', 600, 1)
  })

  it('cleans up stale pending uploads older than 24h', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    const oldPending = {
      id: 3,
      code: 'GHI789',
      status: 'pending',
      files: [
        {
          id: 30,
          chunks: [
            { id: 300, telegram_message_id: 700n, telegram_bot_token_index: 0 },
          ],
        },
      ],
    }
    mockFindMany.mockResolvedValue([oldPending])
    mockDelete.mockResolvedValue(oldPending)

    await cleanupExpiredShares()

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 3 } })
    expect(mockDeleteMessage).toHaveBeenCalledOnce()
  })

  it('handles multiple uploads with multiple files', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    const uploads = [
      {
        id: 4,
        code: 'JKL012',
        status: 'active',
        files: [
          { id: 40, chunks: [{ id: 400, telegram_message_id: 800n, telegram_bot_token_index: 0 }] },
          { id: 41, chunks: [{ id: 401, telegram_message_id: 801n, telegram_bot_token_index: 1 }] },
        ],
      },
      {
        id: 5,
        code: 'MNO345',
        status: 'active',
        files: [
          { id: 50, chunks: [{ id: 500, telegram_message_id: 900n, telegram_bot_token_index: 0 }] },
        ],
      },
    ]
    mockFindMany.mockResolvedValue(uploads)
    mockDelete.mockResolvedValue({})

    await cleanupExpiredShares()

    expect(mockDelete).toHaveBeenCalledTimes(2)
    expect(mockDeleteMessage).toHaveBeenCalledTimes(3)
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 4 } })
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 5 } })
  })

  it('continues cleanup when Telegram deletion fails', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    const upload = {
      id: 6,
      code: 'PQR678',
      status: 'active',
      files: [
        {
          id: 60,
          chunks: [
            { id: 600, telegram_message_id: 1000n, telegram_bot_token_index: 0 },
          ],
        },
      ],
    }
    mockFindMany.mockResolvedValue([upload])
    mockDeleteMessage.mockRejectedValue(new Error('Telegram API error'))
    mockDelete.mockResolvedValue(upload)
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})

    await cleanupExpiredShares()

    expect(mockDeleteMessage).toHaveBeenCalledOnce()
    expect(mockDelete).toHaveBeenCalledOnce()
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })

  it('passes the correct query to findMany', async () => {
    process.env.TELEGRAM_TEMP_CHANNEL_ID = '-1001234567890'
    mockFindMany.mockResolvedValue([])

    await cleanupExpiredShares()

    const query = mockFindMany.mock.calls[0][0]
    expect(query.where.OR).toHaveLength(2)
    expect(query.where.OR[0]).toMatchObject({ status: 'active' })
    expect(query.where.OR[0].expires_at).toHaveProperty('lte')
    expect(query.where.OR[1]).toMatchObject({ status: 'pending' })
    expect(query.where.OR[1].created_at).toHaveProperty('lte')
    expect(query.include).toEqual({
      files: { include: { chunks: true } },
    })
  })
})
