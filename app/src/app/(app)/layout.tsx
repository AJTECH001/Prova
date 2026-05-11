'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { AppLayout } from '@/components/layout/app-layout'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const isAuthorized = useAuthStore((s) => s.isAuthorized)

  useEffect(() => {
    setMounted(true)
    if (!isAuthorized()) {
      router.replace('/')
    }
  }, [isAuthorized, router])

  if (!mounted) return null

  if (!isAuthorized()) return null

  return <AppLayout>{children}</AppLayout>
}
