import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { createHash } from 'crypto'
import { z } from 'zod'

const finalizeSchema = z.object({
  expiresIn: z.enum(['5m', '30m', '1h', '1d', '7d']),
  password: z.string().max(128).optional(),
  maxDownloads: z.number().int().positive().optional(),
})

const EXPIRY_MAP: Record<string, number> = {
  '5m': 5 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode()
    const existing = await prisma.upload_codes.findUnique({ where: { code } })
    if (!existing) return code
  }
  throw new Error('Failed to generate unique code')
}

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

    const uploadCode = await prisma.upload_codes.findUnique({
      where: { id },
      include: {
        files: {
          include: { chunks: true }
        }
      }
    })

    if (!uploadCode) {
      return NextResponse.json({ error: 'Upload session not found' }, { status: 404 })
    }
    if (uploadCode.status !== 'pending') {
      return NextResponse.json({ error: 'Upload already finalized' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = finalizeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { expiresIn, password, maxDownloads } = parsed.data

    for (const file of uploadCode.files) {
      if (file.chunks.length !== file.chunk_count) {
        return NextResponse.json(
          { error: `File "${file.name}" is incomplete (${file.chunks.length}/${file.chunk_count} chunks)` },
          { status: 400 }
        )
      }
    }

    if (uploadCode.files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const code = await generateUniqueCode()
    const expiresAt = new Date(Date.now() + EXPIRY_MAP[expiresIn])

    await prisma.upload_codes.update({
      where: { id },
      data: {
        code,
        status: 'active',
        password_hash: password ? createHash('sha256').update(password).digest('hex') : null,
        expires_at: expiresAt,
        max_downloads: maxDownloads || null,
      }
    })

    return NextResponse.json({ code })
  } catch (error) {
    console.error('Upload finalize error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize upload' },
      { status: 500 }
    )
  }
}
