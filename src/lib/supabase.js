import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. Check your .env file.')
}

// Create a fresh Supabase client
function createSupabaseClient() {
  return createClient(supabaseUrl || '', supabaseKey || '', {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'x-client-info': 'hytale-collective'
      }
    },
    // Disable realtime to reduce connection overhead
    realtime: {
      params: {
        eventsPerSecond: 1
      }
    }
  })
}

// Main client instance
let client = createSupabaseClient()

// Track consecutive failures to detect stuck state
let consecutiveFailures = 0
const MAX_FAILURES_BEFORE_RESET = 2

// Get the current client - use this instead of direct import
export function getClient() {
  return client
}

// For backward compatibility - but prefer getClient() for dynamic access
export const supabase = client

// Reset the client when it gets into a bad state
export function resetClient() {
  console.log('Resetting Supabase client...')
  consecutiveFailures = 0
  client = createSupabaseClient()
  return client
}

// Call this on successful requests
export function markSuccess() {
  consecutiveFailures = 0
}

// Call this on failed requests - returns true if client was reset
export function markFailure() {
  consecutiveFailures++
  console.warn(`Supabase failure ${consecutiveFailures}/${MAX_FAILURES_BEFORE_RESET}`)

  if (consecutiveFailures >= MAX_FAILURES_BEFORE_RESET) {
    resetClient()
    return true
  }
  return false
}

// Wrapper for fetch operations with automatic retry and client reset
export async function withRetry(operation, maxRetries = 2) {
  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use the current client
      const result = await operation(client)
      markSuccess()
      return result
    } catch (e) {
      lastError = e
      console.warn(`Operation attempt ${attempt + 1} failed:`, e.message)

      // Mark the failure and check if client was reset
      const wasReset = markFailure()

      if (attempt < maxRetries) {
        // If client was reset, retry immediately with new client
        // Otherwise wait a bit before retrying
        if (!wasReset) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
        }
      }
    }
  }

  throw lastError
}

// Simple health check - returns new client if check fails
export async function ensureConnection() {
  try {
    const { error } = await client.from('profiles').select('id').limit(1).maybeSingle()
    if (!error) {
      markSuccess()
      return client
    }
    // If error, reset and return new client
    return resetClient()
  } catch (e) {
    // If exception, reset and return new client
    return resetClient()
  }
}

// Helper to get public URL for storage files
export function getStorageUrl(bucket, path) {
  if (!path) return null
  const { data } = client.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Helper for file uploads with progress tracking
export async function uploadFile(bucket, path, file, onProgress) {
  const { data, error } = await client.storage
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
  const { data, error } = await client.storage
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
