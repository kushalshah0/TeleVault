import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma/db'

/**
 * GET /api/activities
 * Get user activities with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Validate pagination parameters
    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 200' },
        { status: 400 }
      )
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 }
      )
    }

    // Get activities for the user
    const activities = await prisma.activities.findMany({
      where: {
        user_id: user.userId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        username: true,
        description: true,
        activity_type: true,
        storage_id: true,
        storage_name: true,
        file_id: true,
        file_name: true,
        folder_id: true,
        folder_name: true,
        created_at: true,
      },
    })

    // Return activities as-is (snake_case)
    const transformedActivities = activities

    // Get total count for pagination metadata
    const totalCount = await prisma.activities.count({
      where: {
        user_id: user.userId,
      },
    })

    return NextResponse.json({
      data: {
        activities: transformedActivities,
        total: totalCount,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}
