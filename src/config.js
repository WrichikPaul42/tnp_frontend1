// Public frontend configuration. Values are supplied in .env; never place server secrets here.
export function cleanEnvValue(value) { return String(value ?? '').replace(/\\/g, '').trim() }

let googleIdentityLoadPromise = null

export function loadGoogleIdentityServices() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google sign-in is only available in a browser.'))
  if (window.google?.accounts?.id) return Promise.resolve()
  if (googleIdentityLoadPromise) return googleIdentityLoadPromise

  googleIdentityLoadPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-google-identity]')
    const isNew = !script
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.googleIdentity = 'true'
    }

    let timeoutId
    const finish = (error) => {
      window.clearTimeout(timeoutId)
      if (error) reject(error)
      else resolve()
    }
    const onLoad = () => window.google?.accounts?.id
      ? finish()
      : finish(new Error('Google Identity Services loaded without the sign-in API. Check browser extensions or network filtering.'))
    const onError = () => finish(new Error('Google Identity Services could not load. Check your internet connection or content blockers.'))

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
    timeoutId = window.setTimeout(() => finish(new Error('Timed out loading Google sign-in. Check your connection and try again.')), 15000)
    if (isNew) document.head.appendChild(script)
  }).catch((error) => {
    googleIdentityLoadPromise = null
    throw error
  })
  return googleIdentityLoadPromise
}

export async function hashNonce(rawNonce) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure nonce hashing is unavailable. Open the site over HTTPS or localhost and try again.')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export const CONFIGURED_API_BASE = cleanEnvValue(import.meta.env.VITE_BACKEND_API_URL || 'https://crispr-tnp.onrender.com').replace(/\/+$/, '')
// In development, route API requests through Vite's proxy to avoid browser CORS preflights.
export const API_BASE = import.meta.env.DEV && import.meta.env.VITE_USE_API_PROXY !== 'false' ? '' : CONFIGURED_API_BASE
export const GOOGLE_CLIENT_ID = cleanEnvValue(import.meta.env.VITE_GOOGLE_CLIENT_ID)
export const COLLEGE_DOMAIN = '@iiitn.ac.in'
export const MAX_PDF_BYTES = 2 * 1024 * 1024
