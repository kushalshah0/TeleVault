'use client'

import StorageView from '@/components/StorageView'
import { useDashboardData } from '../../layout'

export default function StoragePage() {
  const { searchQuery, searchTrigger, clearSearch } = useDashboardData()
  
  return <StorageView searchQuery={searchQuery} searchTrigger={searchTrigger} onClearSearch={clearSearch} />
}
