<script>
  import { auth } from './stores/auth.svelte.js'
  import Button from './Button.svelte'

  let {
    open = false,
    initialMode = 'login',
    onclose = () => {}
  } = $props()

  let mode = $state('login') // 'login' | 'signup'

  // Sync mode with initialMode when modal opens
  $effect(() => {
    if (open) {
      mode = initialMode
    }
  })
  let email = $state('')
  let password = $state('')
  let username = $state('')
  let confirmPassword = $state('')
  let loading = $state(false)
  let error = $state(null)
  let success = $state(null)

  function resetForm() {
    email = ''
    password = ''
    username = ''
    confirmPassword = ''
    error = null
    success = null
  }

  function switchMode(newMode) {
    mode = newMode
    resetForm()
  }

  function close() {
    resetForm()
    onclose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    error = null
    success = null
    loading = true

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters')
        }
        if (!/[A-Z]/.test(password)) {
          throw new Error('Password must contain at least one uppercase letter')
        }
        if (username.length < 3) {
          throw new Error('Username must be at least 3 characters')
        }

        await auth.signUp(email, password, username)
        success = 'Check your email to confirm your account!'
      } else {
        await auth.signIn(email, password)
        close()
      }
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  }

  async function handleOAuth(provider) {
    error = null
    loading = true

    try {
      await auth.signInWithProvider(provider)
    } catch (e) {
      error = e.message
      loading = false
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      close()
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      close()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick}>
    <div class="modal">
      <button class="close-btn" onclick={close}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div class="modal-header">
        <h2 class="modal-title">
          {mode === 'login' ? 'Welcome Back' : 'Join the Collective'}
        </h2>
        <p class="modal-subtitle">
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </p>
      </div>

      <!-- OAuth Buttons -->
      <div class="oauth-buttons">
        <button class="oauth-btn discord" onclick={() => handleOAuth('discord')} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Continue with Discord
        </button>

        <button class="oauth-btn google" onclick={() => handleOAuth('google')} disabled={loading}>
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <button class="oauth-btn github" onclick={() => handleOAuth('github')} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Continue with GitHub
        </button>
      </div>

      <div class="divider">
        <span>or</span>
      </div>

      <!-- Email Form -->
      <form onsubmit={handleSubmit}>
        {#if mode === 'signup'}
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              bind:value={username}
              placeholder="Choose a username"
              required
              minlength="3"
              disabled={loading}
            />
          </div>
        {/if}

        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            bind:value={email}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            bind:value={password}
            placeholder="Enter your password"
            required
            minlength={mode === 'signup' ? 8 : 1}
            disabled={loading}
          />
          {#if mode === 'signup'}
            <small class="password-hint">Min 8 characters, at least one uppercase letter</small>
          {/if}
        </div>

        {#if mode === 'signup'}
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              bind:value={confirmPassword}
              placeholder="Confirm your password"
              required
              disabled={loading}
            />
          </div>
        {/if}

        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        {#if success}
          <div class="success-message">{success}</div>
        {/if}

        <button type="submit" class="submit-btn" disabled={loading}>
          {#if loading}
            <span class="spinner"></span>
          {:else}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          {/if}
        </button>
      </form>

      <div class="switch-mode">
        {#if mode === 'login'}
          Don't have an account?
          <button onclick={() => switchMode('signup')}>Sign up</button>
        {:else}
          Already have an account?
          <button onclick={() => switchMode('login')}>Sign in</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    position: relative;
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    overflow-y: auto;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(70, 58, 42, 0.4) 0%, transparent 50%),
      linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 2px solid #4a3f32;
    border-radius: 8px;
    padding: 2rem;
    box-shadow:
      0 0 0 1px rgba(107, 90, 72, 0.3),
      0 25px 50px rgba(0, 0, 0, 0.5);
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    color: #a89880;
    cursor: pointer;
    transition: color 0.15s;
  }

  .close-btn:hover {
    color: #f0e6d8;
  }

  .close-btn svg {
    width: 20px;
    height: 20px;
  }

  .modal-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .modal-title {
    font-family: 'Cinzel', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 0.5rem 0;
  }

  .modal-subtitle {
    font-size: 0.9rem;
    color: #a89880;
    margin: 0;
  }

  .oauth-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .oauth-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    border: 1px solid #4a3f32;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .oauth-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .oauth-btn svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .oauth-btn.discord {
    background: #5865F2;
    color: white;
    border-color: #5865F2;
  }

  .oauth-btn.discord:hover:not(:disabled) {
    background: #4752C4;
  }

  .oauth-btn.google {
    background: #fff;
    color: #333;
    border-color: #ddd;
  }

  .oauth-btn.google:hover:not(:disabled) {
    background: #f5f5f5;
  }

  .oauth-btn.github {
    background: #24292e;
    color: white;
    border-color: #24292e;
  }

  .oauth-btn.github:hover:not(:disabled) {
    background: #1b1f23;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1.5rem 0;
    color: #6b5a48;
    font-size: 0.85rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, #4a3f32, transparent);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    color: #c4b8a4;
    margin-bottom: 0.5rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    color: #f0e6d8;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #d4a44c;
    box-shadow: 0 0 0 3px rgba(212, 164, 76, 0.15);
  }

  .form-group input::placeholder {
    color: #6b5a48;
  }

  .form-group input:disabled {
    opacity: 0.6;
  }

  .password-hint {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: #8a7a6a;
  }

  .error-message {
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid #c46b6b;
    border-radius: 6px;
    color: #e8a0a0;
    font-size: 0.85rem;
  }

  .success-message {
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    background: rgba(126, 196, 123, 0.15);
    border: 1px solid #7ec47b;
    border-radius: 6px;
    color: #a8e8a5;
    font-size: 0.85rem;
  }

  .submit-btn {
    width: 100%;
    padding: 0.875rem 1.5rem;
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #1a1208;
    background: linear-gradient(180deg, #e8c36b 0%, #c49a3a 50%, #a67c28 100%);
    border: 2px solid #8b6914;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .submit-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #f0d080 0%, #d4a844 50%, #b88830 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 2px 8px rgba(212, 164, 76, 0.4);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid rgba(26, 18, 8, 0.3);
    border-top-color: #1a1208;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .switch-mode {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.9rem;
    color: #a89880;
  }

  .switch-mode button {
    background: none;
    border: none;
    color: #d4a44c;
    font-weight: 500;
    cursor: pointer;
    text-decoration: underline;
  }

  .switch-mode button:hover {
    color: #e8c36b;
  }
</style>
