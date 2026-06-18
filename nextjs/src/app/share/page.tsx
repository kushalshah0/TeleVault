'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ShareRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/#share-tool') }, [router])
  return null
}
