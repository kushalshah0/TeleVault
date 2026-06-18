'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ClaimRedirect() {
  const router = useRouter()
  const params = useParams()
  const code = Array.isArray(params?.code) ? params.code[0] : params?.code

  useEffect(() => {
    if (code) router.replace(`/?claim=${encodeURIComponent(code)}`)
    else router.replace('/')
  }, [router, code])

  return null
}
