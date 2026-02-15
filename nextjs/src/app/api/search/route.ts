import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma/db'

/**
 * GET /api/search
 * Search for files and folders within a specific storage
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const storageId = searchParams.get('storageId')
    const folderId = searchParams.get('folderId')

    console.log('=== SEARCH REQUEST ===')
    console.log('Query:', query)
    console.log('StorageId:', storageId)
    console.log('FolderId:', folderId)
    console.log('UserId:', user.userId)

    // Validate query
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    if (query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Validate storageId is required
    if (!storageId) {
      return NextResponse.json(
        { error: 'Storage ID is required for search' },
        { status: 400 }
      )
    }

    const storageIdNum = parseInt(storageId, 10)
    if (isNaN(storageIdNum)) {
      return NextResponse.json(
        { error: 'Invalid storage ID' },
        { status: 400 }
      )
    }

    // Verify storage ownership
    console.log('Verifying storage ownership...')
    const storage = await prisma.storages.findFirst({
      where: {
        id: storageIdNum,
        owner_id: user.userId,
      },
    })

    if (!storage) {
      console.log('Storage not found or access denied')
      return NextResponse.json(
        { error: 'Storage not found or access denied' },
        { status: 404 }
      )
    }

    console.log('Storage verified:', storage.name)

    // Parse search query - simple approach
    const searchTerm = query.trim()
    
    // Build folder search query
    const folderWhere: any = {
      storage_id: storageIdNum,
      name: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    }

    // Only filter by folder if folderId is provided AND it's a valid number
    if (folderId && folderId !== 'null' && folderId !== 'undefined') {
      const folderIdNum = parseInt(folderId, 10)
      if (!isNaN(folderIdNum)) {
        folderWhere.parent_id = folderIdNum
      }
    }

    console.log('Searching folders...')

    const folders = await prisma.folders.findMany({
      where: folderWhere,
      select: {
        id: true,
        name: true,
        storage_id: true,
        parent_id: true,
        created_at: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 100,
    })

    console.log(`Found ${folders.length} folders`)

    // Build file search query
    const fileWhere: any = {
      storage_id: storageIdNum,
      name: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    }

    // Only filter by folder if folderId is provided AND it's a valid number
    if (folderId && folderId !== 'null' && folderId !== 'undefined') {
      const folderIdNum = parseInt(folderId, 10)
      if (!isNaN(folderIdNum)) {
        fileWhere.folder_id = folderIdNum
      }
    }

    console.log('Searching files...')

    const files = await prisma.files.findMany({
      where: fileWhere,
      select: {
        id: true,
        name: true,
        mime_type: true,
        size: true,
        storage_id: true,
        folder_id: true,
        created_at: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 100,
    })

    console.log(`Found ${files.length} files`)
    console.log('File names:', files.map(f => f.name))

    // Transform results to match frontend expectations - convert BigInt to number
    const transformedFolders = folders.map(folder => ({
      id: Number(folder.id),
      name: folder.name,
      storage_id: Number(folder.storage_id),
      parent_id: folder.parent_id ? Number(folder.parent_id) : null,
      created_at: folder.created_at,
      type: 'folder',
    }))

    const transformedFiles = files.map(file => ({
      id: Number(file.id),
      name: file.name,
      mimeType: file.mime_type,
      size: Number(file.size),
      storage_id: Number(file.storage_id),
      folder_id: file.folder_id ? Number(file.folder_id) : null,
      isStarred: false, // Not in schema, default to false
      created_at: file.created_at,
      type: 'file',
    }))

    // Combine results
    const results = [...transformedFolders, ...transformedFiles]

    return NextResponse.json({
      data: {
        results,
        folders: transformedFolders,
        files: transformedFiles,
        total: results.length,
        query: query.trim(),
      },
    })
  } catch (error) {
    console.error('Error searching:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}
