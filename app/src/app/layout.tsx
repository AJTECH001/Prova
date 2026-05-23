import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  metadataBase: new URL('https://getprova.trade'),
  title: 'Prova — Trade Credit Insurance',
  description: 'On-chain trade credit insurance for SME exporters. FHE-encrypted risk underwriting, ConfidentialEscrow settlement, and USDC liquidity pools.',
  icons: {
    icon: '/prova_logo.png',
    shortcut: '/prova_logo.png',
    apple: '/prova_logo.png',
  },
  openGraph: {
    title: 'Prova — Trade Credit Insurance',
    description: 'On-chain trade credit insurance for SME exporters. Get covered, trade confidently.',
    url: 'https://getprova.trade',
    siteName: 'Prova',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Prova — Trade Credit Insurance',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prova — Trade Credit Insurance',
    description: 'On-chain trade credit insurance for SME exporters. Get covered, trade confidently.',
    images: ['/og-image.png'],
  },
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
