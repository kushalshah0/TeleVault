'use client'

import Dashboard from '@/components/Dashboard'
import { useDashboardData } from '@/context/DashboardContext'

export default function DashboardPage() {
  const { storages, onRefresh } = useDashboardData()
  
  return <Dashboard storages={storages} onRefresh={onRefresh} />
}
