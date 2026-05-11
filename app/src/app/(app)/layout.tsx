'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useWalletStore } from '@/stores/wallet-store'
import { useRefreshStore } from '@/stores/refresh-store'
import { AppLayout } from '@/components/layout/app-layout'

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const isAuthorized = useAuthStore((s) => s.isAuthorized)

  useEffect(() => {
    setMounted(true)
    if (!isAuthorized()) {
      router.replace('/')
      return
    }
    // Re-attach the ZeroDev kernel client after page reload.
    // _provider is a module-level variable that resets on reload, so we reconnect
    // eagerly here (will prompt passkey once). On success, trigger a balance
    // refresh so the cUSDC balance hook can decrypt with the real wallet client.
    const walletStore = useWalletStore.getState()
    if (!walletStore.isConnected()) {
      walletStore.ensureConnected()
        .then(() => useRefreshStore.getState().triggerBalanceRefresh())
        .catch(() => {
          // Non-fatal — sendUserOperation will retry when the user takes action
        })
    }
  }, [isAuthorized, router])

  if (!mounted) return null

  if (!isAuthorized()) return null

  return <AppLayout>{children}</AppLayout>
}
