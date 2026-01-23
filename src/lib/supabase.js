import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'hytale-collective'
    },
    fetch: (url, options = {}) => {
      // Add timeout to all fetch requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout

      return fetch(url, {
        ...options,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))
    }
  },
  // Disable realtime to reduce connection overhead
  realtime: {
    params: {
      eventsPerSecond: 1
    }
  }
})

// Connection state tracking
let isConnected = true
let lastSuccessfulRequest = Date.now()

// Health check function
export async function checkConnection() {
  try {
    const start = Date.now()
    const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
    const elapsed = Date.now() - start

    if (!error) {
      isConnected = true
      lastSuccessfulRequest = Date.now()
      console.debug(`Supabase health check: OK (${elapsed}ms)`)
      return true
    }
    console.warn('Supabase health check failed:', error)
    isConnected = false
    return false
  } catch (e) {
    console.warn('Supabase health check error:', e)
    isConnected = false
    return false
  }
}

export function getConnectionState() {
  return { isConnected, lastSuccessfulRequest }
}

// Helper to get public URL for storage files
export function getStorageUrl(bucket, path) {
  if (!path) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Helper for file uploads with progress tracking
export async function uploadFile(bucket, path, file, onProgress) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error
  return data
}

// Helper for resumable uploads (large files)
export async function uploadLargeFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      // TUS protocol for resumable uploads
      duplex: 'half'
    })

  if (error) throw error
  return data
}
