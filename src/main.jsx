import React from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import App from './App.jsx'
import './index.css'

function cleanUrl(value) {
  return String(value ?? '').replace(/\\/g, '').trim().replace(/\/+$/, '')
}
function cleanPublicKey(value) {
  return String(value ?? '').replace(/\\+$/g, '').trim()
}

const supabaseUrl = cleanUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseKey = cleanPublicKey(import.meta.env.VITE_SUPABASE_ANON_KEY)
const validSupabaseConfig = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)
  && Boolean(supabaseKey)
  && !/your-supabase|placeholder/i.test(supabaseKey)

let supabase = null
if (validSupabaseConfig) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch (error) {
    console.error('Supabase client initialization failed:', error)
  }
} else {
  console.error('Invalid Supabase configuration. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.')
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App supabase={supabase} />
  </React.StrictMode>,
)
