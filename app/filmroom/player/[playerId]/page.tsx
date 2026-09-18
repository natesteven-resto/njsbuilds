'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PlayerPortal() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/filmroom/family')
  }, [router])

  return null
}
