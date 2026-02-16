'use client'

import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Loader } from './ModernLoader'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  item: { id: number; name: string } | null
  itemType?: 'file' | 'folder'
  onShareCreated?: () => void
}

interface ShareLink {
  id: number
  share_url: string
  expires_at: string | null
  max_downloads: number | null
  download_count: number
  created_at: string
  is_expired: boolean
  password: string | null
}

export default function ShareModal({ isOpen, onClose, item, itemType = 'file', onShareCreated }: ShareModalProps) {
  const [expirationDays, setExpirationDays] = useState<number | ''>('')
  const [maxDownloads, setMaxDownloads] = useState<number | ''>('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [originalValues, setOriginalValues] = useState<{expirationDays: number | ''; maxDownloads: number | ''; password: string}>({
    expirationDays: '',
    maxDownloads: '',
    password: ''
  })

  const hasChanges = 
    expirationDays !== originalValues.expirationDays ||
    maxDownloads !== originalValues.maxDownloads ||
    password !== originalValues.password

  useEffect(() => {
    if (isOpen && item) {
      fetchShareLink()
    }
  }, [isOpen, item])

  useEffect(() => {
    if (shareLink) {
      const expDays = shareLink.expires_at 
        ? Math.ceil((new Date(shareLink.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : ''
      const expDaysNum = (typeof expDays === 'number' && expDays > 0 ? expDays : '') as number | ''
      const maxDownNum = (shareLink.max_downloads ? shareLink.max_downloads : '') as number | ''
      const orig = {
        expirationDays: expDaysNum,
        maxDownloads: maxDownNum,
        password: shareLink.password || ''
      }
      setOriginalValues(orig)
      setExpirationDays(orig.expirationDays)
      setMaxDownloads(orig.maxDownloads)
      setPassword(orig.password)
    }
  }, [shareLink])

  const fetchShareLink = async () => {
    if (!item) return
    setIsLoadingDetails(true)
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      const endpoint = itemType === 'folder' ? 'folders' : 'files'
      const response = await fetch(`/api/${endpoint}/${item.id}/share`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (response.ok) {
        const data = await response.json()
        setShareLink(data)
      }
    } catch (err) {
      console.error('Failed to fetch share link:', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const saveShareLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return

    setIsLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      const body: Record<string, unknown> = {}
      
      if (expirationDays !== '') {
        body.expires_in_days = Number(expirationDays)
      }
      if (maxDownloads !== '') {
        body.max_downloads = Number(maxDownloads)
      }
      if (password.trim()) {
        body.password = password
      }

      const response = await fetch(`/api/${itemType === 'folder' ? 'folders' : 'files'}/${item.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save share link')
      }

      const data = await response.json()
      await fetchShareLink()
      
      onShareCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save share link')
      setTimeout(() => setError(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const deleteShareLink = async () => {
    if (!item) return
    
    setIsDeleting(true)
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      const response = await fetch(`/api/${itemType === 'folder' ? 'folders' : 'files'}/${item.id}/share`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete share link')
      }

      setShareLink(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete share link')
      setTimeout(() => setError(''), 3000)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share ${itemType === 'folder' ? 'Folder' : 'File'}: "${item?.name}"`}
      size="lg"
    >
      <div className="space-y-6">
        {isLoadingDetails ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader size="lg" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : shareLink ? (
          <div className={`p-4 rounded-lg ${
            shareLink.is_expired 
              ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' 
              : 'bg-gray-50 dark:bg-gray-800'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <code className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono truncate">
                {shareLink.share_url}
              </code>
              <button
                onClick={() => copyToClipboard(shareLink.share_url)}
                disabled={shareLink.is_expired}
                className={`p-2 rounded transition-colors flex-shrink-0 ${
                  shareLink.is_expired
                    ? 'text-gray-300 cursor-not-allowed'
                    : copied
                      ? 'text-green-600'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title={copied ? 'Copied!' : 'Copy'}
              >
                {copied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span>Created: {formatDate(shareLink.created_at)}</span>
              <span>Expires: {shareLink.expires_at ? formatDate(shareLink.expires_at) : 'Never'}</span>
              <span>{shareLink.download_count}{shareLink.max_downloads ? `/${shareLink.max_downloads}` : ''} downloads</span>
            </div>
            {shareLink.is_expired && (
              <span className="inline-block mt-2 text-xs text-red-500 font-medium">Expired</span>
            )}
          </div>
        ) : null}

        <form onSubmit={saveShareLink} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expires in (days)
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                placeholder="Never expires"
                value={expirationDays}
                onChange={(e) => setExpirationDays(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max downloads
              </label>
              <Input
                type="number"
                min="1"
                max="1000"
                placeholder="Unlimited"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password protection (optional)
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                minLength={4}
                placeholder="Leave empty for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading || (shareLink ? !hasChanges : false)}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : shareLink ? 'Update' : 'Create Link'}
            </Button>
            {shareLink && (
              <Button
                type="button"
                variant="destructive"
                onClick={deleteShareLink}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  )
}
