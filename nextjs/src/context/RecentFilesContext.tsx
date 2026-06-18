'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface RecentFile {
  id: number
  name: string
  size: number
  mime_type: string | null
  created_at: string
  storages: { name: string }
}

interface RecentFilesContextType {
  files: RecentFile[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  fetchFiles: (opts?: { offset?: number; limit?: number; append?: boolean }) => Promise<void>
}

const RecentFilesContext = createContext<RecentFilesContextType | undefined>(undefined)

export function RecentFilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<RecentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const fetchFiles = useCallback(async (opts?: { offset?: number; limit?: number; append?: boolean }) => {
    const offset = opts?.offset ?? 0
    const limit = opts?.limit ?? 20
    const append = opts?.append ?? false

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const res = await fetch(`/api/recents?offset=${offset}&limit=${limit}`)
      const data = await res.json()
      if (append) {
        setFiles(prev => [...prev, ...(data.files || [])])
      } else {
        setFiles(data.files || [])
      }
      setHasMore(data.hasMore || false)
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  return (
    <RecentFilesContext.Provider value={{ files, loading, loadingMore, hasMore, fetchFiles }}>
      {children}
    </RecentFilesContext.Provider>
  )
}

export function useRecentFiles() {
  const context = useContext(RecentFilesContext)
  if (!context) throw new Error('useRecentFiles must be used within RecentFilesProvider')
  return context
}
