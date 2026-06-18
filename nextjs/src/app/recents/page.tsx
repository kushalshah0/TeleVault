'use client'

import { useState, useEffect, useRef } from 'react'
import FileIcon from '@/components/ui/FileIcon'
import { Loader } from '@/components/ModernLoader'
import ThemeToggle from '@/components/ThemeToggle'
import { Eye, Download, X, Clock, FileText, ArrowLeft, ChevronRight } from 'lucide-react'
import FilePreview from '@/components/FilePreview'
import Link from 'next/link'
import { useRecentFiles } from '@/context/RecentFilesContext'

interface RecentFile {
  id: number
  name: string
  size: number
  mime_type: string | null
  created_at: string
  storages: { name: string }
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export default function RecentsPage() {
  const { files, loading, loadingMore, hasMore, fetchFiles } = useRecentFiles()
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [detailsFile, setDetailsFile] = useState<RecentFile | null>(null)
  const [viewFile, setViewFile] = useState<RecentFile | null>(null)

  const handleRowClick = (file: RecentFile, e: React.MouseEvent) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      setViewFile(file)
      return
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null
    }, 250)
  }

  useEffect(() => {
    if (files.length === 0) fetchFiles({ limit: 7 })
  }, [])

  const handleDownload = async (file: RecentFile, asBlob?: boolean): Promise<Blob | undefined> => {
    try {
      const response = await fetch(`/api/public/files/${file.id}/download`)
      if (!response.ok) {
        if (!asBlob) alert('Download failed')
        return undefined
      }
      const blob = await response.blob()

      if (asBlob) return blob

      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      if (!asBlob) alert('Download failed')
      return undefined
    }
  }

  const loadMore = () => fetchFiles({ offset: files.length, limit: 5, append: true })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 max-w-7xl mx-auto">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-2xl">☁️</span>
              <span className="text-lg font-bold text-foreground tracking-tight">TeleVault</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Recent Files */}
      <section className="relative flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Back to home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Recent uploads</h1>
                <p className="text-sm text-muted-foreground mt-1">Public files uploaded to TeleVault</p>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">All files</h2>
              </div>
              <div className="p-3">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        onClick={(e) => handleRowClick(file, e)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group cursor-pointer"
                      >
                        <FileIcon mimeType={file.mime_type || ''} size="sm" className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate leading-snug">{file.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <span>{formatSize(file.size)}</span>
                            <span>·</span>
                            <span>{file.storages.name}</span>
                            <span>·</span>
                            <span>{timeAgo(file.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => setDetailsFile(file)}
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {files.length > 0 && (
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="w-full mt-3 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                      >
                        {loadingMore ? (
                          <Loader />
                        ) : (
                          <>
                            Load more
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto py-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TeleVault
          </div>
        </div>
      </footer>

      {/* Details Modal */}
      {detailsFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetailsFile(null)}>
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">File Details</h3>
              <button
                onClick={() => setDetailsFile(null)}
                className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <FileIcon mimeType={detailsFile.mime_type || ''} size="lg" />
              <div className="min-w-0">
                <p className="font-medium text-foreground break-all">{detailsFile.name}</p>
                <p className="text-sm text-muted-foreground">{detailsFile.mime_type || 'Unknown type'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Size</span>
                <span className="text-foreground font-medium">{formatSize(detailsFile.size)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground font-medium">{getFileExtension(detailsFile.name).toUpperCase() || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Uploaded</span>
                <span className="text-foreground font-medium">{timeAgo(detailsFile.created_at)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Storage</span>
                <span className="text-foreground font-medium">{detailsFile.storages.name}</span>
              </div>
            </div>
            <button
              onClick={() => { setDetailsFile(null); handleDownload(detailsFile) }}
              className="w-full mt-4 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        </div>
      )}

      {/* FilePreview Modal */}
      {viewFile && (
        <FilePreview
          file={{
            id: viewFile.id,
            name: viewFile.name,
            size: viewFile.size,
            mime_type: viewFile.mime_type || undefined
          }}
          onClose={() => setViewFile(null)}
          onDownload={(file: any, asBlob?: boolean) => handleDownload(file as RecentFile, asBlob)}
        />
      )}
    </div>
  )
}
