import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Prova — Trade Credit Insurance',
  description: 'On-chain trade credit insurance for SME exporters. FHE-encrypted risk underwriting, ConfidentialEscrow settlement, and USDC liquidity pools.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
