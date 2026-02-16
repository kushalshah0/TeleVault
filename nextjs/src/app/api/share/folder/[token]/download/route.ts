import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/db'
import archiver from 'archiver'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    let body = {}
    try {
      body = await request.json()
    } catch {}

    const { password, item_ids, all, path = '' } = body as { 
      password?: string
      item_ids?: number[]
      all?: boolean
      path?: string
    }

    // Find folder share
    const share = await prisma.folder_shares.findUnique({
      where: { token },
      include: {
        folders: {
          include: {
            storages: true
          }
        }
      }
    })

    if (!share) {
      return NextResponse.json(
        { error: 'Share link not found or expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (share.expires_at && new Date() > share.expires_at) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      )
    }

    // Check password
    if (share.password) {
      if (!password || password !== share.password) {
        return NextResponse.json(
          { error: 'Incorrect password', requires_password: true },
          { status: 401 }
        )
      }
    }

    // Check max downloads
    if (share.max_downloads && share.download_count >= share.max_downloads) {
      return NextResponse.json(
        { error: 'Maximum download limit reached for this share link' },
        { status: 403 }
      )
    }

    // Get folder contents
    const folderPath = share.folders.path + (path ? '/' + path : '')
    
    // Find current folder
    const currentFolder = await prisma.folders.findFirst({
      where: {
        storage_id: share.folders.storage_id,
        path: folderPath
      }
    })

    if (!currentFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Get files to download
    let filesToDownload: any[] = []
    
    if (all) {
      // Get all files recursively
      filesToDownload = await getAllFilesRecursive(currentFolder.id, share.folders.storage_id)
    } else if (item_ids && item_ids.length > 0) {
      // Get specific files
      filesToDownload = await prisma.files.findMany({
        where: { 
          id: { in: item_ids },
          folders: { storage_id: share.folders.storage_id }
        },
        include: { folders: true }
      })
    } else {
      return NextResponse.json(
        { error: 'No items selected for download' },
        { status: 400 }
      )
    }

    if (filesToDownload.length === 0) {
      return NextResponse.json(
        { error: 'No files found to download' },
        { status: 404 }
      )
    }

    // Increment download count
    await prisma.folder_shares.update({
      where: { id: share.id },
      data: { download_count: { increment: 1 } }
    })

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    // Create a PassThrough stream to capture archive data
    const chunks: Uint8Array[] = []
    
    archive.on('data', (chunk) => {
      chunks.push(chunk)
    })

    // Process files and add to archive
    const { downloadFile } = await import('@/lib/telegram')
    
    const folderBasePath = share.folders.path.replace(/^\//, '')
    
    for (const file of filesToDownload) {
      try {
        // Get file path relative to the shared folder root
        const fileFolderPath = file.folders.path.replace(/^\//, '').replace(folderBasePath, '').replace(/^\//, '')
        const filePath = fileFolderPath ? fileFolderPath + '/' + file.name : file.name
        
        // Get chunks for this file
        const chunks = await prisma.file_chunks.findMany({
          where: { file_id: file.id },
          orderBy: { chunk_index: 'asc' }
        })
        
        if (chunks.length === 0) continue

        // Download file content
        const chunkData = chunks.map(c => ({
          fileId: c.telegram_file_id,
          botIndex: c.telegram_bot_token_index,
          chunkIndex: c.chunk_index
        }))
        
        const fileBuffer = await downloadFile(chunkData, 3)
        
        // Add to archive with folder structure preserved
        archive.append(fileBuffer, { name: filePath })
      } catch (err) {
        console.error(`Failed to add file ${file.name}:`, err)
      }
    }

    // Finalize the archive
    await new Promise<void>((resolve, reject) => {
      archive.on('end', resolve)
      archive.on('error', reject)
      archive.finalize()
    })

    // Combine all chunks into a single buffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const resultBuffer = Buffer.concat(chunks, totalLength)

    // Return the zip as a response
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(currentFolder.name)}.zip`)
    
    return new NextResponse(resultBuffer, { headers })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    )
  }
}

async function getAllFilesRecursive(folderId: number, storageId: number): Promise<any[]> {
  const files: any[] = []
  
  // Get files in current folder
  const currentFiles = await prisma.files.findMany({
    where: { folder_id: folderId },
    include: { folders: true }
  })
  files.push(...currentFiles)
  
  // Get subfolders
  const subfolders = await prisma.folders.findMany({
    where: { parent_id: folderId }
  })
  
  // Recursively get files from subfolders
  for (const subfolder of subfolders) {
    const subfolderFiles = await getAllFilesRecursive(subfolder.id, storageId)
    files.push(...subfolderFiles)
  }
  
  return files
}
