'use client'

import { useState, useEffect, useRef } from 'react'
import FileIcon from '@/components/ui/FileIcon'
import { Loader } from '@/components/ModernLoader'
import ThemeToggle from '@/components/ThemeToggle'
import { Eye, Download, X, Clock, FileText, Shield, Zap, ArrowRight, ChevronRight } from 'lucide-react'
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

export default function HomePage() {
  const { files, loading, fetchFiles } = useRecentFiles()
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

  return (
    <div className="min-h-screen bg-background">
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

      {/* Hero + Recent Uploads */}
      <section className="relative">
        <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-20 lg:items-center">
            {/* Hero */}
            <div className="text-center lg:text-left mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Powered by Telegram
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
                Cloud storage{' '}
                <br className="hidden sm:block" />
                on your{' '}
                <span className="text-primary">terms</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-md lg:max-w-none mx-auto lg:mx-0 leading-relaxed">
                Upload, organize, and share files securely using your Telegram channels.
                No third-party servers, no hidden fees.
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-3 mt-8">
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2 shadow-lg shadow-primary/25"
                >
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-accent transition-colors inline-flex items-center gap-2"
                >
                  Browse files
                </Link>
              </div>
            </div>

            {/* Recent Uploads */}
            <div className="min-w-0">
              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground flex-1">Recent uploads</h2>
                  <Link
                    href="/recents"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 font-medium"
                  >
                    View all
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="p-3">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader />
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1 pr-1">
                      {files.slice(0, 7).map((file) => (
                        <div
                          key={file.id}
                          onClick={(e) => handleRowClick(file, e)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors group cursor-pointer"
                        >
                          <FileIcon mimeType={file.mime_type || ''} size="sm" className="flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate leading-snug">{file.name}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span>{formatSize(file.size)}</span>
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto grid sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <CloudIcon />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Telegram Storage</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Files are stored in your Telegram channels, leveraging their infrastructure for reliable cloud storage.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Secure Sharing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Share files and folders with password protection, expiration dates, and download limits.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Fast Uploads</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Parallel chunked uploads using multiple Telegram bots for maximum speed and reliability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto py-6 flex items-center justify-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-base">☁️</span>
              <span>TeleVault</span>
            </div>
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

function CloudIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  )
}
