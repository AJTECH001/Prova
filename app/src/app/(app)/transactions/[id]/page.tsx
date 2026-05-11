'use client'

import { use } from 'react'
import { TransactionDetailPage } from '@/routes/_authenticated/transactions/$id'

export default function TransactionDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <TransactionDetailPage id={id} />
}
