/**
 * File upload hook with parallel client-side chunking
 */
import { useState, useCallback } from 'react'
import { invalidateCache } from '@/utils/apiCache'

const CHUNK_SIZE = 4 * 1024 * 1024 // 4MB chunks for Vercel compatibility
const CONCURRENT_UPLOADS = 5 // Upload 5 chunks in parallel

export interface UploadProgress {
  uploadedChunks: number
  totalChunks: number
  percentage: number
  currentSpeed: number // bytes/second
  estimatedTimeRemaining: number // seconds
  uploadedBytes: number
}

export interface UploadOptions {
  storageId: number
  folderId?: number
  onProgress?: (progress: UploadProgress) => void
  onComplete?: (fileId: number) => void
  onError?: (error: Error) => void
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  /**
   * Upload a file with parallel chunking
   */
  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<number> => {
    const { storageId, folderId, onProgress, onComplete, onError } = options

    setUploading(true)
    const controller = new AbortController()
    setAbortController(controller)

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    let uploadedChunks = 0
    let uploadedBytes = 0
    let fileId: number | null = null
    const startTime = Date.now()

    try {
      // Helper function to upload a single chunk
      const uploadChunk = async (index: number, start: number, end: number) => {
        const chunkBlob = file.slice(start, end)
        const formData = new FormData()
        
        formData.append('chunk', chunkBlob)
        formData.append('chunkIndex', index.toString())
        formData.append('totalChunks', totalChunks.toString())
        formData.append('fileName', file.name)
        formData.append('fileSize', file.size.toString())
        formData.append('mimeType', file.type)
        if (folderId) formData.append('folderId', folderId.toString())
        if (fileId) formData.append('fileId', fileId.toString())

        // Get auth token (check both localStorage and sessionStorage)
        let token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
        if (!token) {
          throw new Error('Not authenticated')
        }

        const response = await fetch(`/api/storages/${storageId}/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        })

        // If 401, try to refresh token and retry
        if (response.status === 401) {
          const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
          if (!refreshToken) {
            throw new Error('Session expired. Please log in again.')
          }

          // Try to refresh the token
          try {
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            })

            if (refreshResponse.ok) {
              const data = await refreshResponse.json()
              const newToken = data.data.accessToken
              
              // Store new token in the same storage as original
              const useLocalStorage = localStorage.getItem('rememberMe') === 'true'
              if (useLocalStorage) {
                localStorage.setItem('accessToken', newToken)
              } else {
                sessionStorage.setItem('accessToken', newToken)
              }

              // Retry the upload with new token
              const retryResponse = await fetch(`/api/storages/${storageId}/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                  'Authorization': `Bearer ${newToken}`
                },
                signal: controller.signal
              })

              if (!retryResponse.ok) {
                const error = await retryResponse.json()
                throw new Error(error.error || 'Upload failed after token refresh')
              }

              return retryResponse
            } else {
              throw new Error('Session expired. Please log in again.')
            }
          } catch (refreshError) {
            throw new Error('Session expired. Please log in again.')
          }
        }

        const finalResponse = response.status === 401 ? await response : response

        if (!finalResponse.ok) {
          const error = await finalResponse.json()
          throw new Error(error.error || 'Upload failed')
        }

        const result = await finalResponse.json()

        // Store fileId from first chunk
        if (index === 0 && result.data?.file_id) {
          fileId = result.data.file_id
        }

        // Update progress
        uploadedChunks++
        uploadedBytes += (end - start)
        
        const elapsed = (Date.now() - startTime) / 1000 // seconds
        const speed = uploadedBytes / elapsed // bytes/second
        const remainingBytes = file.size - uploadedBytes
        const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0
        
        const progressData: UploadProgress = {
          uploadedChunks,
          totalChunks,
          percentage: Math.round((uploadedChunks / totalChunks) * 100 * 100) / 100, // Round to 2 decimal places
          currentSpeed: speed,
          estimatedTimeRemaining,
          uploadedBytes,
        }

        setProgress(progressData)
        onProgress?.(progressData)

        return result
      }

      // STEP 1: Upload first chunk to get fileId
      if (totalChunks > 0) {
        if (controller.signal.aborted) throw new Error('Upload cancelled')
        await uploadChunk(0, 0, Math.min(CHUNK_SIZE, file.size))
      }

      // STEP 2: Upload remaining chunks in parallel batches
      if (totalChunks > 1) {
        for (let i = 1; i < totalChunks; i += CONCURRENT_UPLOADS) {
          if (controller.signal.aborted) throw new Error('Upload cancelled')

          const batchEnd = Math.min(i + CONCURRENT_UPLOADS, totalChunks)
          const batchPromises = []

          for (let j = i; j < batchEnd; j++) {
            const start = j * CHUNK_SIZE
            const end = Math.min((j + 1) * CHUNK_SIZE, file.size)
            batchPromises.push(uploadChunk(j, start, end))
          }

          await Promise.all(batchPromises)
        }
      }

      if (!fileId) {
        throw new Error('File upload failed - no fileId received')
      }

      // Invalidate cache after successful upload
      invalidateCache.file(storageId, folderId || null)

      setUploading(false)
      setProgress(null)
      setAbortController(null)
      onComplete?.(fileId)
      
      return fileId

    } catch (error) {
      setUploading(false)
      setProgress(null)
      setAbortController(null)
      
      const uploadError = error instanceof Error ? error : new Error('Upload failed')
      onError?.(uploadError)
      throw uploadError
    }
  }, [])

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setUploading(false)
      setProgress(null)
      setAbortController(null)
    }
  }, [abortController])

  return {
    uploadFile,
    cancelUpload,
    uploading,
    progress,
  }
}
