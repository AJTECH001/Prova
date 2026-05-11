import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack(config, { isServer }) {
    // WASM support for tfhe / @cofhe/sdk
    config.experiments = { ...config.experiments, asyncWebAssembly: true }

    // Web worker format
    config.output = { ...config.output, globalObject: 'globalThis' }

    // Node polyfills for ZeroDev / viem on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },

  // Keep WASM + COEP headers required by SharedArrayBuffer (CoFHE)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy',  value: 'credentialless' },
        ],
      },
    ]
  },

  // Exclude WASM-heavy packages from server bundling
  serverExternalPackages: ['tfhe', 'node-tfhe'],

  // Pin the tracing root to this package to avoid the multi-lockfile warning
  outputFileTracingRoot: require('path').join(__dirname, '../'),
}

export default nextConfig
