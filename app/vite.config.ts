import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve, join, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// Resolve the cofhe SDK dist directory via pnpm's symlink resolution
function cofheSdkDist(): string | null {
  try {
    return dirname(_require.resolve('@cofhe/sdk/dist/web.js'));
  } catch {
    return null;
  }
}

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['stream', 'util', 'buffer', 'process', 'crypto', 'events'],
      globals: { process: true, Buffer: true, global: true },
    }),
    react(),
    tailwindcss(),
    // When @cofhe/sdk/web is pre-bundled into .vite/deps/, the worker URL
    // resolves to /@vite/deps/zkProve.worker.js which doesn't exist there.
    // Intercept that request and serve the real worker with its relative
    // chunk imports rewritten to /@fs/ absolute paths so the browser can
    // follow them back to the SDK dist directory.
    {
      name: 'cofhe-worker-devserver',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.includes('zkProve.worker.js')) return next();

          const sdkDist = cofheSdkDist();
          if (!sdkDist) return next();

          const workerPath = join(sdkDist, 'zkProve.worker.js');
          if (!existsSync(workerPath)) return next();

          let content = readFileSync(workerPath, 'utf-8');

          // Rewrite './chunk-*.js' imports to absolute /@fs/ URLs so the browser
          // resolves them from the SDK dist dir, not from /@vite/deps/.
          const fsBase = sdkDist.replace(/\\/g, '/');
          content = content.replace(
            /from '(\.\/.+?)'/g,
            (_match, rel) => `from '/@fs${fsBase}/${rel.replace(/^\.\//, '')}'`,
          );

          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(content);
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // tfhe/node-tfhe are WASM packages that must be excluded.
    // @cofhe/sdk stays in optimizeDeps (default) so its CJS deps like
    // tweetnacl and iframe-shared-storage are pre-bundled correctly.
    exclude: ['tfhe', 'node-tfhe'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 4831,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
});
