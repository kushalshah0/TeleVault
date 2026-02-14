'use client'

import { createContext, useContext } from 'react'

interface DashboardDataContextType {
  storages: any[]
  onRefresh: (skipCache?: boolean) => Promise<void>
  searchQuery: string
  searchTrigger: number
  clearSearch: () => void
}

export const DashboardDataContext = createContext<DashboardDataContextType | null>(null)

export const useDashboardData = () => {
  const context = useContext(DashboardDataContext)
  if (!context) {
    throw new Error('useDashboardData must be used within DashboardLayout')
  }
  return context
}
