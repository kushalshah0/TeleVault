import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import { serializeBigInt } from '@/lib/utils/serialize'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const files = await prisma.files.findMany({
      where: { is_public: true },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit + 1,
      include: {
        storages: {
          select: { name: true }
        }
      }
    })

    const hasMore = files.length > limit
    if (hasMore) files.pop()

    return NextResponse.json({ files: serializeBigInt(files), hasMore })
  } catch (error) {
    console.error('Error fetching recent files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent files' },
      { status: 500 }
    )
  }
}
