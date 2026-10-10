import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

function cleanUrl(value) {
  return String(value ?? '').replace(/\\/g, '').trim().replace(/\/+$/, '')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = cleanUrl(env.VITE_BACKEND_API_URL || 'https://crispr-tnp.onrender.com')
  const proxyTarget = {
    target: backendTarget,
    changeOrigin: true,
    secure: true,
    configure(proxy) {
      proxy.on('error', (error) => {
        console.error(`[TNP API proxy] Cannot reach ${backendTarget}: ${error.message}`)
      })
    },
  }
  const proxy = {
    '/api': { ...proxyTarget },
    '/storage': { ...proxyTarget },
    '/share': { ...proxyTarget },
    '/health': { ...proxyTarget },
  }

  return {
    plugins: [react()],
    server: { proxy },
  }
})
