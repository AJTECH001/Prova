import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Prova — Trade Credit Insurance'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f3460 100%)',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://getprova.trade/prova_logo.png"
            width={48}
            height={48}
            alt="Prova logo"
            style={{ borderRadius: '10px' }}
          />
          <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Prova
          </span>
        </div>

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(37, 99, 235, 0.2)',
            border: '1px solid rgba(37, 99, 235, 0.5)',
            borderRadius: '100px',
            padding: '6px 16px',
            marginBottom: '24px',
          }}
        >
          <span style={{ color: '#60a5fa', fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px' }}>
            ON-CHAIN TRADE CREDIT INSURANCE
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '64px',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-2px',
            marginBottom: '20px',
            maxWidth: '800px',
          }}
        >
          Export with confidence.
        </div>

        {/* Sub-headline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: '24px',
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: '680px',
          }}
        >
          FHE-encrypted risk underwriting, ConfidentialEscrow settlement, and USDC liquidity pools.
        </div>

        {/* Domain watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '80px',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '16px',
            fontWeight: 500,
          }}
        >
          getprova.trade
        </div>
      </div>
    ),
    { ...size }
  )
}
