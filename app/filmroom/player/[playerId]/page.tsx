'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PlayerPortal() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/filmroom')
  }, [router])

  return null
}
