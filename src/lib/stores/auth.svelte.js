import { supabase } from '../supabase.js'

// Auth state using Svelte 5 runes
let user = $state(null)
let profile = $state(null)
let loading = $state(true)
let currentSessionExpiresAt = $state(null)
let authModalOpen = $state(false)
let authModalMode = $state('login') // 'login' | 'signup'

// Track the auth subscription for cleanup
let authSubscription = null

// Initialize auth state
async function initialize() {
  loading = true

  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Error getting session:', sessionError)
    } else if (session?.user) {
      user = session.user
      currentSessionExpiresAt = session.expires_at
      // Fetch profile in the background - don't block initialization
      fetchProfile().catch(e => console.error('Error fetching profile:', e))
    }
  } catch (e) {
    console.error('Error initializing auth:', e)
  } finally {
    loading = false
  }

  // Clean up any existing subscription before creating a new one
  if (authSubscription) {
    authSubscription.unsubscribe()
    authSubscription = null
  }

  // Listen for auth changes
  // IMPORTANT: Never use await inside this callback - it causes deadlocks!
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event, 'Session expires_at:', session?.expires_at)

    // Only process if this is actually a different session
    // This prevents duplicate processing on TOKEN_REFRESHED and tab focus events
    const newExpiresAt = session?.expires_at || null
    const sessionChanged = newExpiresAt !== currentSessionExpiresAt

    if (!sessionChanged && event !== 'SIGNED_OUT') {
      console.log('Session unchanged, skipping update')
      return
    }

    // Update session tracking
    currentSessionExpiresAt = newExpiresAt

    // Handle different auth events
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'INITIAL_SESSION':
        user = session?.user || null
        if (user) {
          // Defer the async profile fetch to avoid deadlock
          // Using setTimeout(0) allows the callback to complete first
          setTimeout(() => {
            fetchProfile().catch(e => console.error('Error fetching profile on auth change:', e))
          }, 0)
        }
        break

      case 'SIGNED_OUT':
        user = null
        profile = null
        currentSessionExpiresAt = null
        break

      case 'USER_UPDATED':
        user = session?.user || null
        // Refresh profile on user update
        setTimeout(() => {
          fetchProfile().catch(e => console.error('Error fetching profile on user update:', e))
        }, 0)
        break

      default:
        // Handle any other events (PASSWORD_RECOVERY, etc.)
        user = session?.user || null
        break
    }
  })

  authSubscription = subscription

  // Set up visibility change handler for tab switching
  setupVisibilityHandler()
}

// Handle tab visibility changes to recover session when user returns
function setupVisibilityHandler() {
  if (typeof document === 'undefined') return

  // Remove any existing handler first
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

async function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return

  console.log('Tab became visible, checking session...')

  try {
    // When tab regains focus, refresh the session to ensure it's valid
    // This also triggers token refresh if needed
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Error refreshing session on visibility change:', error)
      // If session refresh fails, try to recover
      const { error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Session recovery failed, user may need to re-login:', userError)
        // Clear auth state if session is truly invalid
        user = null
        profile = null
        currentSessionExpiresAt = null
      }
      return
    }

    if (session?.user && !user) {
      // Session recovered after being lost
      console.log('Session recovered on tab focus')
      user = session.user
      currentSessionExpiresAt = session.expires_at
      fetchProfile().catch(e => console.error('Error fetching profile on recovery:', e))
    } else if (!session && user) {
      // Session was lost while tab was hidden
      console.log('Session lost while tab was hidden')
      user = null
      profile = null
      currentSessionExpiresAt = null
    }
  } catch (e) {
    console.error('Error handling visibility change:', e)
  }
}

// Cleanup function - call this when unmounting
function cleanup() {
  if (authSubscription) {
    authSubscription.unsubscribe()
    authSubscription = null
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}

// Fetch user profile
async function fetchProfile() {
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  profile = data
  return data
}

// Sign up with email/password
async function signUp(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username
      }
    }
  })

  if (error) throw error
  return data
}

// Sign in with email/password
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error
  return data
}

// Sign in with OAuth provider
async function signInWithProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) throw error
  return data
}

// Sign out
async function signOut() {
  // Try Supabase signOut
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch (e) {
    // Ignore - we'll manually clear storage below
  }

  // Manually clear Supabase storage as fallback
  if (typeof localStorage !== 'undefined') {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

  // Clear our local state
  user = null
  profile = null
  currentSessionExpiresAt = null
  authModalOpen = false
}

// Manually refresh the session - useful for recovering from edge cases
async function refreshSession() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('Session refresh failed:', error)
      // Try to get current session state
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) {
        user = null
        profile = null
        currentSessionExpiresAt = null
      }
      return { success: false, error }
    }

    if (session) {
      user = session.user
      currentSessionExpiresAt = session.expires_at
      await fetchProfile().catch(e => console.error('Error fetching profile after refresh:', e))
      return { success: true, session }
    }

    return { success: false, error: new Error('No session returned') }
  } catch (e) {
    console.error('Error refreshing session:', e)
    return { success: false, error: e }
  }
}

// Update profile
async function updateProfile(updates) {
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  profile = data
  return data
}

// Modal controls
function openModal(mode = 'login') {
  authModalMode = mode
  authModalOpen = true
}

function closeModal() {
  authModalOpen = false
}

// Delete user account
async function deleteAccount() {
  if (!user) throw new Error('Not authenticated')

  // Call the database function to delete the account
  const { error } = await supabase.rpc('delete_user_account')

  if (error) throw error

  // Clear local state
  user = null
  profile = null
  currentSessionExpiresAt = null
  authModalOpen = false

  // Clear Supabase storage
  if (typeof localStorage !== 'undefined') {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

// Check if username needs to be set (auto-generated from OAuth)
function needsUsernameSetup() {
  if (!user || !profile) return false

  const username = profile.username
  if (!username) return true

  // Check if username contains spaces (OAuth full name like "John Smith")
  if (username.includes(' ')) return true

  // Check if username looks auto-generated (starts with user_ followed by random chars)
  // This pattern is set by our database trigger for OAuth signups
  if (/^user_[a-z0-9]+$/i.test(username)) return true

  return false
}

// Export reactive getters and methods
export const auth = {
  get user() { return user },
  get profile() { return profile },
  get loading() { return loading },
  get isAuthenticated() { return !!user },
  get isAdmin() { return profile?.role === 'admin' || profile?.is_admin === true },
  get modalOpen() { return authModalOpen },
  get modalMode() { return authModalMode },
  get needsUsernameSetup() { return needsUsernameSetup() },

  initialize,
  cleanup,
  refreshSession,
  fetchProfile,
  signUp,
  signIn,
  signInWithProvider,
  signOut,
  updateProfile,
  deleteAccount,
  openModal,
  closeModal
}
