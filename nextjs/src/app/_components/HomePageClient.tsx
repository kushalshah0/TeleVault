'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import FileIcon from '@/components/ui/FileIcon'
import { Loader } from '@/components/ModernLoader'
import ThemeToggle from '@/components/ThemeToggle'
import {
  Download, X, Clock, FileText, Shield, Zap, ArrowRight,
  ChevronRight, Upload, Copy, Check, Lock, 
  Image, Video, FileArchive, FileAudio, FileCode, FileType,
  Eye, KeyRound, Link2, Hourglass, Globe,
} from 'lucide-react'
import FilePreview from '@/components/FilePreview'
import Link from 'next/link'
import { useRecentFiles } from '@/context/RecentFilesContext'
import { useSearchParams } from 'next/navigation'

const CHUNK_SIZE = 4 * 1024 * 1024
const MAX_TOTAL_SIZE = 50 * 1024 * 1024
const MAX_FILES = 10
const CONCURRENCY = 3

interface RecentFile {
  id: number
  name: string
  size: number
  mime_type: string | null
  created_at: string
  storages: { name: string }
}

interface SelectedFile {
  id: string
  file: File
  chunks: Blob[]
  uploadedChunks: number
}

interface ShareFile {
  id: number
  name: string
  size: number
  mime_type: string | null
}

interface ShareInfo {
  has_password: boolean
  expires_at: string | null
  max_downloads: number | null
  download_count: number
  total_size: number
  created_at: string
  files: ShareFile[]
}

type ShareMode = 'upload' | 'download'
type UploadState = 'idle' | 'uploading' | 'done' | 'error'

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
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function formatExpiresIn(dateString: string | null): string {
  if (!dateString) return 'Never'
  const diffMs = new Date(dateString).getTime() - Date.now()
  if (diffMs <= 0) return 'Expired'
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffSecs = Math.floor((diffMs % 60000) / 1000)
  if (diffMins < 60) return `${diffMins} min ${diffSecs} sec`
  if (diffHours < 24) return `${diffHours} hr ${diffMins % 60} min`
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours % 24} hr`
}

function typeColor(mimeType: string | null): string {
  if (!mimeType) return 'text-blue-500'
  if (mimeType.startsWith('image/')) return 'text-purple-500'
  if (mimeType.startsWith('video/')) return 'text-red-500'
  if (mimeType.startsWith('audio/')) return 'text-emerald-500'
  if (mimeType.includes('pdf')) return 'text-rose-600'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z'))
    return 'text-amber-500'
  if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml'))
    return 'text-sky-500'
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('python') || mimeType.includes('html') || mimeType.includes('css'))
    return 'text-yellow-500'
  return 'text-blue-500'
}

function typeBg(mimeType: string | null): string {
  if (!mimeType) return 'bg-blue-500/10'
  if (mimeType.startsWith('image/')) return 'bg-purple-500/10'
  if (mimeType.startsWith('video/')) return 'bg-red-500/10'
  if (mimeType.startsWith('audio/')) return 'bg-emerald-500/10'
  if (mimeType.includes('pdf')) return 'bg-rose-500/10'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z'))
    return 'bg-amber-500/10'
  if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml'))
    return 'bg-sky-500/10'
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('python') || mimeType.includes('html') || mimeType.includes('css'))
    return 'bg-yellow-500/10'
  return 'bg-blue-500/10'
}

function getFileIcon(mimeType: string | null) {
  const color = typeColor(mimeType)
  if (!mimeType) return <FileType className={`w-5 h-5 ${color}`} />
  if (mimeType.startsWith('image/')) return <Image className={`w-5 h-5 ${color}`} />
  if (mimeType.startsWith('video/')) return <Video className={`w-5 h-5 ${color}`} />
  if (mimeType.startsWith('audio/')) return <FileAudio className={`w-5 h-5 ${color}`} />
  if (mimeType.includes('pdf')) return <FileType className={`w-5 h-5 ${color}`} />
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z'))
    return <FileArchive className={`w-5 h-5 ${color}`} />
  if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml'))
    return <FileText className={`w-5 h-5 ${color}`} />
  if (mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('python') || mimeType.includes('html') || mimeType.includes('css'))
    return <FileCode className={`w-5 h-5 ${color}`} />
  return <FileType className={`w-5 h-5 ${color}`} />
}

const expiryOptions = [
  { value: '5m', label: '5 min' },
  { value: '30m', label: '30 min' },
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
]

const modes: { value: ShareMode; label: string; icon: typeof Upload }[] = [
  { value: 'upload', label: 'Upload', icon: Upload },
  { value: 'download', label: 'Download', icon: Download },
]

export default function HomePage() {
  const searchParams = useSearchParams()
  const { files, loading, fetchFiles } = useRecentFiles()
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [detailsFile, setDetailsFile] = useState<RecentFile | null>(null)
  const [viewFile, setViewFile] = useState<RecentFile | null>(null)

  const [mode, setMode] = useState<ShareMode>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<SelectedFile[]>([])
  const [expiresIn, setExpiresIn] = useState('1h')
  const [password, setPassword] = useState('')
  const [maxDownloads, setMaxDownloads] = useState('')
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [, setUploadError] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Download state
  const [claimCode, setClaimCode] = useState('')
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [claimPassword, setClaimPassword] = useState('')
  const [downloading, setDownloading] = useState<number | null>(null)
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [claimPasswordError, setClaimPasswordError] = useState('')
  const [claimPasswordLoading, setClaimPasswordLoading] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!shareInfo) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [shareInfo])

  useEffect(() => {
    if (files.length === 0) fetchFiles({ limit: 7 })
  }, [files.length, fetchFiles])

  useEffect(() => {
    const claim = searchParams.get('claim')
    if (claim) {
      setMode('download')
      setClaimCode(claim.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))
    }
  }, [searchParams])

  const handleRowClick = (file: RecentFile, _e: React.MouseEvent) => {
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

  // Upload handlers
  const addFiles = useCallback((incoming: FileList | File[]) => {
    setUploadError('')
    const arr = Array.from(incoming)
    const currentTotal = uploadFiles.reduce((sum, f) => sum + f.file.size, 0)
    const newTotal = arr.reduce((sum, f) => sum + f.size, 0)
    if (currentTotal + newTotal > MAX_TOTAL_SIZE) {
      setUploadError(`Total size exceeds 50 MB limit`)
      return
    }
    if (uploadFiles.length + arr.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} files allowed`)
      return
    }
    const newFiles: SelectedFile[] = arr.map(file => {
      const chunks: Blob[] = []
      for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
        chunks.push(file.slice(offset, offset + CHUNK_SIZE))
      }
      return { id: Math.random().toString(36).slice(2), file, chunks, uploadedChunks: 0 }
    })
    setUploadFiles(prev => [...prev, ...newFiles])
  }, [uploadFiles])

  const removeFile = (id: string) => setUploadFiles(prev => prev.filter(f => f.id !== id))

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const startUpload = async () => {
    if (uploadFiles.length === 0) return
    setUploadError('')
    setUploadState('uploading')

    try {
      const initRes = await fetch('/api/share/upload/init', { method: 'POST' })
      if (!initRes.ok) throw new Error('Failed to initialize upload')
      const { uploadId } = await initRes.json()

      const allChunks: { fileIndex: number; chunkIndex: number; blob: Blob; file: SelectedFile }[] = []
      uploadFiles.forEach((sf, fileIndex) => {
        sf.chunks.forEach((blob, chunkIndex) => {
          allChunks.push({ fileIndex, chunkIndex, blob, file: sf })
        })
      })
      setProgress({ current: 0, total: allChunks.length })

      for (let i = 0; i < allChunks.length; i += CONCURRENCY) {
        const batch = allChunks.slice(i, i + CONCURRENCY)
        await Promise.all(batch.map(async ({ fileIndex, chunkIndex, blob, file }) => {
          const formData = new FormData()
          formData.set('file', blob, `${file.file.name}_chunk_${chunkIndex}`)
          formData.set('fileName', file.file.name)
          formData.set('fileIndex', fileIndex.toString())
          formData.set('chunkIndex', chunkIndex.toString())
          formData.set('totalChunks', file.chunks.length.toString())
          formData.set('mimeType', file.file.type)
          const res = await fetch(`/api/share/upload/${uploadId}/chunk`, { method: 'POST', body: formData })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Chunk upload failed')
          }
        }))
        setProgress({ current: Math.min(i + CONCURRENCY, allChunks.length), total: allChunks.length })
      }

      const finalizeRes = await fetch(`/api/share/upload/${uploadId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresIn,
          password: password || undefined,
          maxDownloads: maxDownloads ? parseInt(maxDownloads) : undefined,
        })
      })
      if (!finalizeRes.ok) {
        const data = await finalizeRes.json()
        throw new Error(data.error || 'Finalize failed')
      }
      const { code } = await finalizeRes.json()
      setShareCode(code)
      setUploadState('done')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
      setUploadState('error')
    }
  }

  const copyCode = async () => {
    const url = `${window.location.origin}/?claim=${shareCode}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      try {
        document.execCommand('copy')
      } catch {
        // Fallback failed, clipboard API should have worked
      }
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetUpload = () => {
    setUploadFiles([])
    setUploadState('idle')
    setShareCode('')
    setUploadError('')
    setProgress({ current: 0, total: 0 })
    setPassword('')
    setMaxDownloads('')
  }

  // Download handlers
  const fetchShareInfo = async () => {
    if (!claimCode.trim()) return
    setClaimLoading(true)
    setClaimError('')
    setShareInfo(null)
    try {
      const res = await fetch(`/api/share/${claimCode.trim()}`)
      if (!res.ok) {
        if (res.status === 410) setClaimError('This share has expired')
        else if (res.status === 404) { setClaimError('Invalid code'); setTimeout(() => setClaimError(''), 3000) }
        else if (res.status === 403) { const d = await res.json(); setClaimError(d.error || 'Download limit reached') }
        else { const d = await res.json(); setClaimError(d.error || 'Failed to load') }
        setClaimLoading(false)
        return
      }
      const data = await res.json()
      setShareInfo(data)
      setClaimLoading(false)
    } catch {
      setClaimError('Failed to load. Check your connection.')
      setClaimLoading(false)
    }
  }

  const handleClaimDownload = async (fileId: number) => {
    if (!claimCode.trim()) return
    setDownloading(fileId)
    try {
      const headers: Record<string, string> = {}
      if (shareInfo?.has_password && claimPassword) headers['x-password'] = claimPassword
      const res = await fetch(`/api/share/${claimCode.trim()}/download/${fileId}`, { headers })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 401) { setClaimError('Incorrect password'); setDownloading(null); setTimeout(() => setClaimError(''), 3000); return }
        throw new Error(data.error || 'Download failed')
      }
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition')
      let filename = shareInfo?.files.find(f => f.id === fileId)?.name || 'download'
      if (cd) { const m = cd.match(/filename\*?=UTF-8''(.+?)(?:;|$)/); if (m) filename = decodeURIComponent(m[1]) }
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl; link.download = filename
      document.body.appendChild(link); link.click()
      document.body.removeChild(link); window.URL.revokeObjectURL(blobUrl)
      setDownloading(null)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Download failed')
      setDownloading(null)
    }
  }

  const verifyPassword = async () => {
    if (!claimPassword) { setClaimPasswordError('Password required'); return }
    setClaimPasswordError('')
    setClaimPasswordLoading(true)
    try {
      const res = await fetch(`/api/share/${claimCode.trim()}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: claimPassword })
      })
      const data = await res.json()
      if (data.valid) {
        setPasswordVerified(true)
      } else {
        setClaimPasswordError(data.error || 'Incorrect password')
      }
    } catch {
      setClaimPasswordError('Verification failed')
    } finally {
      setClaimPasswordLoading(false)
    }
  }

  const isExpired = shareInfo?.expires_at && new Date(shareInfo.expires_at) < new Date()
  const limitReached = shareInfo?.max_downloads != null && shareInfo.download_count >= shareInfo.max_downloads

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

      {/* Hero + Quick Share */}
      <section className="relative">
        <div className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 lg:items-center">
            <div className="text-center lg:text-left mb-10 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Powered by Telegram
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1]">
                Cloud storage{' '}
                <br className="hidden sm:block" />
                on your{' '}
                <span className="text-primary">terms</span>
              </h1>
              <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-md lg:max-w-none mx-auto lg:mx-0 leading-relaxed">
                Upload, organize, and share files securely using your Telegram channels.
                No third-party servers, no hidden fees.
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-3 mt-6">
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2 shadow-lg shadow-primary/25"
                >
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/recents"
                  className="px-5 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-accent transition-colors inline-flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Recent uploads
                </Link>
              </div>
            </div>

            <div className="lg:flex lg:justify-center">
              <div className="w-full lg:max-w-md rounded-2xl bg-card border border-border shadow-sm shadow-primary/5 overflow-hidden">
              <div className="relative px-5 pt-5 pb-3 border-b border-border/60 bg-gradient-to-r from-primary/[0.04] to-transparent">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary/30 via-primary/15 to-transparent" />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Quick Share</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Upload or claim files with a share code</p>
              </div>
              <div className="px-5 pt-3 pb-1">
                <div className="flex bg-muted/50 border border-border/50 rounded-lg p-0.5">
                  {modes.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setMode(m.value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        mode === m.value
                          ? 'bg-card text-foreground shadow-sm border border-border'
                          : 'text-muted-foreground hover:text-foreground border border-transparent'
                      }`}
                    >
                      <m.icon className="w-3.5 h-3.5" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`p-5 flex flex-col ${(mode === 'upload' && uploadState === 'idle' && uploadFiles.length > 0) || (mode === 'download' && shareInfo && !claimLoading) ? 'h-[320px] overflow-y-auto scrollbar-thin scroll-smooth' : 'h-[320px]'}`}>
                {mode === 'upload' ? (
                  <>
                    {uploadState === 'done' ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center mb-4 ring-1 ring-success/20">
                          <Check className="w-6 h-6 text-success" />
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">Share Created!</h3>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">Share this link with anyone</p>
                        <div className="w-full flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-2.5 mb-3 text-xs border border-border/50">
                          <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 text-foreground font-mono truncate">
                            {typeof window !== 'undefined' ? window.location.origin : ''}/?claim={shareCode}
                          </span>
                          <button onClick={copyCode} className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button onClick={resetUpload} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                          Share more files
                        </button>
                      </div>
                    ) : uploadState === 'uploading' ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                          <span className="text-sm font-medium text-foreground">Uploading</span>
                          <span className="text-xs text-muted-foreground ml-auto">{progress.current} / {progress.total} chunks</span>
                        </div>
                        {uploadFiles.length > 0 && (
                          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 mb-3 scrollbar-thin">
                            {uploadFiles.map((sf) => {
                              const mime = sf.file.type || null
                              return (
                                <div key={sf.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-accent/20 border border-border/30">
                                  <div className={`w-7 h-7 rounded-lg ${typeBg(mime)} flex items-center justify-center flex-shrink-0`}>
                                    {getFileIcon(mime)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate leading-snug">{sf.file.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{formatSize(sf.file.size)}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden border border-border/30 flex-shrink-0">
                          <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl py-5 px-5 text-center cursor-pointer transition-all mb-3 ${
                             dragOver ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40 hover:bg-accent/20'
                           }`}
                        >
                          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
                          <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-1.5">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">Drop files here</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Up to 10 files · 50 MB total</p>
                        </div>

                        {uploadFiles.length > 0 && (
                          <div className="space-y-1 mb-4">
                            {uploadFiles.map((sf) => {
                              const mime = sf.file.type || null
                              return (
                                <div key={sf.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/30 transition-colors group border border-transparent hover:border-border/40">
                                  <div className={`w-7 h-7 rounded-lg ${typeBg(mime)} flex items-center justify-center flex-shrink-0`}>
                                    {getFileIcon(mime)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate leading-snug">{sf.file.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{formatSize(sf.file.size)}</p>
                                  </div>
                                  <button onClick={() => removeFile(sf.id)} className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}

              <div className="space-y-3 overflow-y-auto">
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Expires in</p>
                            <div className="flex flex-wrap gap-1.5">
                              {expiryOptions.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => setExpiresIn(opt.value)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                                    expiresIn === opt.value
                                      ? 'bg-primary text-primary-foreground shadow-sm border border-primary/20'
                                      : 'bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password (optional)"
                                className="w-full h-9 pl-8 pr-2.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                              />
                            </div>
                            <div className="relative w-28">
                              <Download className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <input
                                type="number"
                                min={1}
                                value={maxDownloads}
                                onChange={(e) => setMaxDownloads(e.target.value)}
                                placeholder="Max DL"
                                className="w-full h-9 pl-8 pr-2.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                              />
                            </div>
                          </div>
                          <button
                            onClick={startUpload}
                            disabled={uploadFiles.length === 0}
                            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
                          >
                            <Upload className="w-4 h-4" />
                            Upload & Generate Link
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col">
                    {!claimLoading && !shareInfo && (
                      <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Download className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-sm font-semibold text-foreground">Enter share code</h3>
                          <p className="text-xs text-muted-foreground mt-1">Enter the 6-character code to receive files</p>
                        </div>
                        <div className="relative w-full max-w-[260px]">
                          {claimError && (
                            <p className="absolute -top-2.5 left-3 text-[11px] text-destructive font-medium bg-background px-1">{claimError}</p>
                          )}
                          <input
                            type="text"
                            value={claimCode}
                            onChange={(e) => { setClaimCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setClaimError('') }}
                            onKeyDown={(e) => e.key === 'Enter' && claimCode.length === 6 && fetchShareInfo()}
                            placeholder="ABC123"
                            className={`w-full h-11 px-3 rounded-xl border bg-background text-sm font-mono font-semibold text-foreground placeholder:text-muted-foreground/60 placeholder:text-center placeholder:font-normal placeholder:font-sans tracking-[0.3em] text-center uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all ${
                              claimError ? 'border-destructive ring-1 ring-destructive/30' : 'border-input'
                            }`}
                          />
                        </div>
                        <button
                          onClick={fetchShareInfo}
                          disabled={claimCode.length !== 6}
                          className="w-full max-w-[220px] h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
                        >
                          <Download className="w-4 h-4" />
                          Get Files
                        </button>
                        <p className="text-[11px] text-muted-foreground">No account required · Files expire automatically</p>
                      </div>
                    )}

                    {claimLoading && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader size="lg" />
                          <p className="text-sm text-muted-foreground">Loading...</p>
                        </div>
                      </div>
                    )}

                    {shareInfo && !claimLoading && (
                      <>
                        {shareInfo.has_password && !passwordVerified ? (
                          <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                              <button onClick={() => { setShareInfo(null); setClaimError('') }} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-1 py-0.5">
                                ← Back
                              </button>
                              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-md border border-primary/15 font-mono tracking-wider">
                                {claimCode}
                              </span>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center">
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5 ring-1 ring-amber-500/20">
                                <KeyRound className="w-6 h-6 text-amber-500" />
                              </div>
                              <h3 className="text-sm font-semibold text-foreground mb-1">Password required</h3>
                              <p className="text-xs text-muted-foreground mb-5 text-center">Enter the password to access files.</p>
                              <div className="w-full max-w-[240px] space-y-3">
                                <div className="relative">
                                  <input
                                    type="password"
                                    value={claimPassword}
                                    onChange={(e) => { setClaimPassword(e.target.value); setClaimPasswordError('') }}
                                    onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                                    placeholder="Enter password"
                                    className={`w-full h-10 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all ${
                                      claimPasswordError ? 'border-destructive ring-1 ring-destructive/30' : 'border-input'
                                    }`}
                                  />
                                  {claimPasswordError && (
                                    <p className="absolute -top-5 left-0 text-[11px] text-destructive font-medium">{claimPasswordError}</p>
                                  )}
                                </div>
                                <button
                                  onClick={verifyPassword}
                                  disabled={claimPasswordLoading}
                                  className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20 active:scale-[0.98]"
                                >
                                  {claimPasswordLoading ? (
                                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                  ) : (
                                    <KeyRound className="w-4 h-4" />
                                  )}
                                  {claimPasswordLoading ? 'Unlocking...' : 'Unlock'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                              <button onClick={() => { setShareInfo(null); setClaimError(''); setPasswordVerified(false); setClaimPassword(''); setClaimPasswordError('') }} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-1 py-0.5">
                                ← Back
                              </button>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-md border border-primary/15 font-mono tracking-wider">
                                  {claimCode}
                                </span>
                                <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md border border-border/30 text-[11px] text-muted-foreground">
                                  <Download className="w-3 h-3" />
                                  {shareInfo.download_count}{shareInfo.max_downloads ? ` / ${shareInfo.max_downloads}` : ''}
                                </span>
                                <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md border border-border/30 text-[11px] text-muted-foreground">
                                  <Hourglass className="w-3 h-3" />
                                  {formatExpiresIn(shareInfo.expires_at)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              {shareInfo.files.map((file) => (
                                <div key={file.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/40 transition-colors group border border-transparent hover:border-border/40">
                                  <div className={`w-8 h-8 rounded-xl ${typeBg(file.mime_type)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                    {getFileIcon(file.mime_type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate leading-snug">{file.name}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatSize(file.size)}</p>
                                  </div>
                                  <button
                                    onClick={() => handleClaimDownload(file.id)}
                                    disabled={downloading === file.id || isExpired || limitReached}
                                    className="h-8 w-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary/20 active:scale-95"
                                  >
                                    {downloading === file.id ? (
                                      <div className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>

                            {isExpired && (
                              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-destructive/20 text-xs text-destructive font-medium flex-shrink-0">
                                <Hourglass className="w-3 h-3" />
                                This share has expired
                              </div>
                            )}
                            {limitReached && !isExpired && (
                              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground font-medium flex-shrink-0">
                                <Download className="w-3 h-3" />
                                Download limit reached
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* Features + Recent Uploads */}
      <section className="border-t border-border">
        <div className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-5 lg:gap-8 xl:gap-12">
            <div className="lg:col-span-2 mb-8 lg:mb-0 lg:h-[380px]">
              <h2 className="text-lg font-semibold text-foreground mb-6">Why TeleVault?</h2>
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-card p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Upload to Telegram</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Your files are stored in your own Telegram channels — no cloud lock-in.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Link2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Instant Sharing</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Generate share codes in seconds. Recipients don&apos;t need an account.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Privacy First</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">No third-party servers. End-to-end encrypted transfer via Telegram.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Automatic Cleanup</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Self-destructing shares with expiry times and download limits.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Browser-Based</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Works entirely in your browser. No app installation or setup required.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 lg:h-[380px] flex flex-col">
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground flex-1">Recent uploads</h2>
                <Link
                  href="/recents"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 font-medium"
                >
                  View all
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-16"><Loader /></div>
                ) : files.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                  </div>
                ) : (
                  files.slice(0, 7).map((file) => (
                    <div
                      key={file.id}
                      onClick={(e) => handleRowClick(file, e)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer group"
                    >
                      <FileIcon mimeType={file.mime_type || ''} className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(file.size)} · {timeAgo(file.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setViewFile(file) }} className="h-8 w-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(file) }} className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                </div>
              </div>
            </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-base">☁️</span>
              <span className="font-medium text-foreground">TeleVault</span>
              <span className="hidden sm:inline mx-1.5">·</span>
              <span className="hidden sm:inline">&copy; {new Date().getFullYear()} All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span>Powered by Telegram</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>Anonymous file sharing</span>
            </div>
            <span className="sm:hidden text-xs">&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Details Modal */}
      {detailsFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetailsFile(null)}>
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">File Details</h3>
              <button onClick={() => setDetailsFile(null)} className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
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
            <button onClick={() => { setDetailsFile(null); handleDownload(detailsFile) }} className="w-full mt-4 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        </div>
      )}

      {/* FilePreview Modal */}
      {viewFile && (
        <FilePreview
          file={{ id: viewFile.id, name: viewFile.name, size: viewFile.size, mime_type: viewFile.mime_type || undefined }}
          onClose={() => setViewFile(null)}
          onDownload={(file: any, asBlob?: boolean) => handleDownload(file as RecentFile, asBlob)}
        />
      )}
    </div>
  )
}
