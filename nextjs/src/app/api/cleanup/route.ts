import { NextResponse } from 'next/server'
import { cleanupExpiredShares } from '@/lib/share-cleanup'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await cleanupExpiredShares({ force: true })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cleanup] cron job failed:', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
