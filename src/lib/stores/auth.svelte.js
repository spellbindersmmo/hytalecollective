import { supabase } from '../supabase.js'

// Auth state using Svelte 5 runes
let user = $state(null)
let profile = $state(null)
let loading = $state(true)

// Initialize auth state
async function initialize() {
  loading = true

  // Get current session
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    user = session.user
    await fetchProfile()
  }

  loading = false

  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    user = session?.user || null

    if (user) {
      await fetchProfile()
    } else {
      profile = null
    }
  })
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
  const { error } = await supabase.auth.signOut()
  if (error) throw error

  user = null
  profile = null
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

// Export reactive getters and methods
export const auth = {
  get user() { return user },
  get profile() { return profile },
  get loading() { return loading },
  get isAuthenticated() { return !!user },
  get isAdmin() { return profile?.role === 'admin' || profile?.is_admin === true },

  initialize,
  fetchProfile,
  signUp,
  signIn,
  signInWithProvider,
  signOut,
  updateProfile
}
