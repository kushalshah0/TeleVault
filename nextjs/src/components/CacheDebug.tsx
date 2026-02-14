/**
 * Cache Debug Component - Shows cache statistics (for development/testing)
 */
'use client'

import { useState, useEffect } from 'react'
import { apiCache } from '@/utils/apiCache'

export function CacheDebug() {
  const [stats, setStats] = useState({ total: 0, valid: 0, expired: 0 })
  const [show, setShow] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(apiCache.getStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs shadow-lg hover:bg-gray-700"
        title="Show cache stats"
      >
        📊 Cache
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Cache Statistics</h3>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Entries:</span>
          <span className="font-mono">{stats.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Valid:</span>
          <span className="font-mono text-green-400">{stats.valid}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Expired:</span>
          <span className="font-mono text-red-400">{stats.expired}</span>
        </div>
      </div>

      <button
        onClick={() => {
          apiCache.clear()
          setStats({ total: 0, valid: 0, expired: 0 })
        }}
        className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium"
      >
        Clear Cache
      </button>
    </div>
  )
}
