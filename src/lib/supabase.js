import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. Check your .env file.')
}

// Create the Supabase client
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
      },
      fetch: fetchWithRetry
    },
    // Disable realtime to reduce connection overhead
    realtime: {
      params: {
        eventsPerSecond: 1
      }
    }
  })
}

// Custom fetch with automatic retry for failed requests
async function fetchWithRetry(url, options = {}) {
  const maxRetries = 2
  const baseDelay = 1000
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        // Add a reasonable timeout via AbortController if not already set
        signal: options.signal || AbortSignal.timeout(60000)
      })

      // If we get a response (even an error response), return it
      // Let Supabase handle the error parsing
      return response

    } catch (err) {
      lastError = err
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError'
      const isNetworkError = err.message?.includes('fetch') || err.message?.includes('network')

      console.warn(`Fetch attempt ${attempt + 1}/${maxRetries + 1} failed:`, err.message)

      // Don't retry if it was intentionally aborted (not timeout)
      if (err.name === 'AbortError' && !isTimeout) {
        throw err
      }

      // Retry on timeout or network errors
      if (attempt < maxRetries && (isTimeout || isNetworkError)) {
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw err
    }
  }

  throw lastError
}

// Single client instance
const client = createSupabaseClient()

// Export the client
export const supabase = client

// Also export as getClient for compatibility
export function getClient() {
  return client
}

// Helper to get public URL for storage files
export function getStorageUrl(bucket, path) {
  if (!path) return null
  const { data } = client.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Query helper with retry logic for database operations
export async function queryWithRetry(queryFn, maxRetries = 2) {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn(client)

      // Check for Supabase-level errors
      if (result.error) {
        // Don't retry on auth/permission errors
        if (result.error.code === 'PGRST301' || result.error.code === '42501') {
          return result
        }
        throw result.error
      }

      return result

    } catch (err) {
      lastError = err
      console.warn(`Query attempt ${attempt + 1}/${maxRetries + 1} failed:`, err.message)

      if (attempt < maxRetries) {
        const delay = 1000 * (attempt + 1)
        console.log(`Retrying query in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }

  return { data: null, error: lastError }
}

// Storage upload helper with retry logic
export async function uploadWithRetry(bucket, path, file, options = {}, maxRetries = 2) {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt + 1}/${maxRetries + 1} to ${bucket}/${path}`)

      const { data, error } = await client.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          ...options
        })

      if (error) {
        // Don't retry on duplicate/conflict errors
        if (error.statusCode === 409 || error.message?.includes('duplicate')) {
          return { data: null, error }
        }
        throw error
      }

      console.log('Upload successful:', path)
      return { data, error: null }

    } catch (err) {
      lastError = err
      console.warn(`Upload attempt ${attempt + 1}/${maxRetries + 1} failed:`, err.message)

      if (attempt < maxRetries) {
        const delay = 2000 * (attempt + 1)
        console.log(`Retrying upload in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }

  return { data: null, error: lastError }
}

// Helper for file uploads (uses retry logic internally via custom fetch)
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

// Legacy exports for backward compatibility
export function markSuccess() {}
export function markFailure() { return false }
export function resetClient() { return client }
export async function ensureConnection() { return client }
