import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  return NextResponse.redirect(new URL(`/share/file/${token}`, request.url))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  return NextResponse.redirect(new URL(`/share/file/${token}`, request.url))
}
