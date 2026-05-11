'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { AppLayout } from '@/components/layout/app-layout'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthorized = useAuthStore((s) => s.isAuthorized)

  useEffect(() => {
    if (!isAuthorized()) {
      router.replace('/')
    }
  }, [isAuthorized, router])

  if (!isAuthorized()) return null

  return <AppLayout>{children}</AppLayout>
}
