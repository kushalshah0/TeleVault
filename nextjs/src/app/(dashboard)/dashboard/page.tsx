'use client'

import Dashboard from '@/components/Dashboard'
import { useDashboardData } from '../layout'

export default function DashboardPage() {
  const { storages, onRefresh } = useDashboardData()
  
  return <Dashboard storages={storages} onRefresh={onRefresh} />
}
