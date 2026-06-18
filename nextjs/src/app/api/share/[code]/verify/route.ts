import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { createHash } from 'crypto'
import { z } from 'zod'

const verifySchema = z.object({
  password: z.string(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    const uploadCode = await prisma.upload_codes.findUnique({
      where: { code }
    })

    if (!uploadCode || uploadCode.status !== 'active') {
      return NextResponse.json({ valid: false, error: 'Share not found' }, { status: 404 })
    }

    if (!uploadCode.password_hash) {
      return NextResponse.json({ valid: true, password_required: false })
    }

    const body = await request.json()
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ valid: false, error: 'Password required' }, { status: 400 })
    }

    const hash = createHash('sha256').update(parsed.data.password).digest('hex')
    const valid = hash === uploadCode.password_hash

    if (!valid) {
      return NextResponse.json({ valid: false, error: 'Incorrect password' }, { status: 401 })
    }

    return NextResponse.json({ valid: true, password_required: true })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
