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
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen && file) {
      fetchShareLinks()
    }
  }, [isOpen, file])

  const fetchShareLinks = async () => {
    if (!file) return
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      const response = await fetch(`/api/files/${file.id}/share`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (response.ok) {
        const data = await response.json()
        setShareLinks(data)
      }
    } catch (err) {
      console.error('Failed to fetch share links:', err)
    }
  }

  const createShareLink = async (e: React.FormEvent) => {
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
        throw new Error(data.error || 'Failed to create share link')
      }

      const data = await response.json()
      
      setShareLinks(prev => [{
        id: Date.now(),
        share_url: data.share_url,
        expires_at: data.expires_at,
        max_downloads: data.max_downloads,
        download_count: 0,
        created_at: data.created_at,
        is_expired: false
      }, ...prev])

      setExpirationDays('')
      setMaxDownloads('')
      setPassword('')
      
      onShareCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link')
      setTimeout(() => setError(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (url: string, id: number) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const deleteShareLink = async (shareId: number) => {
    if (!file) return
    
    setDeletingId(shareId)
    try {
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      const response = await fetch(`/api/files/${file.id}/share?share_id=${shareId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete share link')
      }

      setShareLinks(prev => prev.filter(s => s.id !== shareId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete share link')
      setTimeout(() => setError(''), 3000)
    } finally {
      setDeletingId(null)
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
        <form onSubmit={createShareLink} className="space-y-4">
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

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating...' : 'Create Share Link'}
          </Button>
        </form>

        {shareLinks.length > 0 && (
          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
              Existing Links ({shareLinks.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {shareLinks.map((link) => (
                <div
                  key={link.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs ${
                    link.is_expired 
                      ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' 
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono truncate">
                        {link.share_url}
                      </code>
                      {link.is_expired && (
                        <span className="text-red-500 text-[10px] font-medium shrink-0">Expired</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                      <span>Created: {formatDate(link.created_at)}</span>
                      <span>Expires: {link.expires_at ? formatDate(link.expires_at) : 'Never'}</span>
                      <span>{link.download_count}{link.max_downloads ? `/${link.max_downloads}` : '↓'} downloads</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => copyToClipboard(link.share_url, link.id)}
                      disabled={link.is_expired}
                      className={`p-1.5 rounded transition-colors ${
                        link.is_expired
                          ? 'text-gray-300 cursor-not-allowed'
                          : copiedId === link.id
                            ? 'text-green-600'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                      title={copiedId === link.id ? 'Copied!' : 'Copy'}
                    >
                      {copiedId === link.id ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => deleteShareLink(link.id)}
                      disabled={deletingId === link.id}
                      className="p-1.5 rounded transition-colors text-gray-400 hover:text-red-500 disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === link.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Share Link Info</p>
              <p className="text-blue-700 dark:text-blue-300">
                Anyone with this link can download the file without logging in. 
                Set an expiration date or download limit for security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
