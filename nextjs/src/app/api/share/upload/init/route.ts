import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'

export async function POST() {
  try {
    const uploadCode = await prisma.upload_codes.create({
      data: { status: 'pending' }
    })

    return NextResponse.json({ uploadId: uploadCode.id })
  } catch (error) {
    console.error('Upload init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize upload' },
      { status: 500 }
    )
  }
}
