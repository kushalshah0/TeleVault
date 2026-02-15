'use client'

import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  file: { id: number; name: string } | null
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
}

export default function ShareModal({ isOpen, onClose, file, onShareCreated }: ShareModalProps) {
  const [expirationDays, setExpirationDays] = useState<number | ''>('')
  const [maxDownloads, setMaxDownloads] = useState<number | ''>('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (isOpen && file) {
      fetchShareLink()
    }
  }, [isOpen, file])

  const fetchShareLink = async () => {
    if (!file) return
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      const response = await fetch(`/api/files/${file.id}/share`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (response.ok) {
        const data = await response.json()
        setShareLink(data)
      }
    } catch (err) {
      console.error('Failed to fetch share link:', err)
    }
  }

  const saveShareLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

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

      const response = await fetch(`/api/files/${file.id}/share`, {
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

      setExpirationDays('')
      setMaxDownloads('')
      setPassword('')
      
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
    if (!file) return
    
    setIsDeleting(true)
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      const response = await fetch(`/api/files/${file.id}/share`, {
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
      title={`Share "${file?.name}"`}
      size="lg"
    >
      <div className="space-y-6">
        {shareLink && (
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
        )}

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
            <Input
              type="password"
              minLength={4}
              placeholder="Leave empty for no password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : shareLink ? 'Update Link' : 'Create Link'}
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

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Share Link Info</p>
              <p className="text-blue-700 dark:text-blue-300">
                Each file has one share link. Update the settings anytime - the link stays the same.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
