<script>
  import { auth } from './stores/auth.svelte.js'
  import { supabase } from './supabase.js'
  import Button from './Button.svelte'

  let { open = false, onclose = () => {} } = $props()

  let username = $state('')
  let loading = $state(false)
  let checking = $state(false)
  let error = $state(null)
  let available = $state(null)

  let checkTimeout = null

  // Debounced username availability check
  function handleUsernameInput(e) {
    username = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    error = null
    available = null

    if (checkTimeout) clearTimeout(checkTimeout)

    if (username.length >= 3) {
      checking = true
      checkTimeout = setTimeout(() => checkUsernameAvailability(), 500)
    } else {
      checking = false
    }
  }

  async function checkUsernameAvailability() {
    if (username.length < 3) {
      checking = false
      return
    }

    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()

      if (queryError) throw queryError

      // Check if username belongs to current user (they can keep their own)
      if (data && data.id === auth.user?.id) {
        available = true
      } else {
        available = !data
      }
    } catch (e) {
      console.error('Error checking username:', e)
      available = null
    } finally {
      checking = false
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    error = null

    if (username.length < 3) {
      error = 'Username must be at least 3 characters'
      return
    }

    if (username.length > 20) {
      error = 'Username must be 20 characters or less'
      return
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      error = 'Username can only contain letters, numbers, and underscores'
      return
    }

    if (available === false) {
      error = 'This username is already taken'
      return
    }

    loading = true

    try {
      await auth.updateProfile({ username })
      onclose()
    } catch (e) {
      if (e.message?.includes('duplicate') || e.code === '23505') {
        error = 'This username is already taken'
        available = false
      } else {
        error = e.message || 'Failed to update username'
      }
    } finally {
      loading = false
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && !loading) {
      // Don't allow closing without setting username
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="modal-backdrop">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">Choose Your Username</h2>
        <p class="modal-subtitle">Pick a unique username for your account</p>
      </div>

      <form onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="username">Username</label>
          <div class="input-wrapper">
            <span class="input-prefix">@</span>
            <input
              type="text"
              id="username"
              value={username}
              oninput={handleUsernameInput}
              placeholder="your_username"
              minlength="3"
              maxlength="20"
              disabled={loading}
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
            />
            {#if checking}
              <span class="input-status checking">
                <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </span>
            {:else if username.length >= 3}
              {#if available === true}
                <span class="input-status available">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              {:else if available === false}
                <span class="input-status taken">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              {/if}
            {/if}
          </div>
          <small class="input-hint">
            3-20 characters. Letters, numbers, and underscores only.
          </small>
          {#if available === false && !error}
            <small class="input-error">This username is already taken</small>
          {/if}
        </div>

        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <Button
          variant="primary"
          type="submit"
          disabled={loading || checking || username.length < 3 || available === false}
        >
          {loading ? 'Saving...' : 'Continue'}
        </Button>
      </form>

      <p class="note">
        This will be your unique identifier on Hytale Collective.
        Choose wisely - it cannot be changed later!
      </p>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #4a3f32;
    border-radius: 12px;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
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

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #c4b8a4;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-prefix {
    position: absolute;
    left: 0.75rem;
    color: #8a7a6a;
    font-size: 0.95rem;
    pointer-events: none;
  }

  input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 1.75rem;
    background: linear-gradient(180deg, #1a1714 0%, #141210 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
    color: #f0e6d8;
    font-size: 0.95rem;
    transition: border-color 0.15s;
  }

  input:focus {
    outline: none;
    border-color: #6bb8cc;
  }

  input::placeholder {
    color: #5a4a3a;
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .input-status {
    position: absolute;
    right: 0.75rem;
    display: flex;
    align-items: center;
  }

  .input-status svg {
    width: 18px;
    height: 18px;
  }

  .input-status.checking svg {
    color: #8a7a6a;
    animation: spin 1s linear infinite;
  }

  .input-status.available svg {
    color: #7ec47b;
  }

  .input-status.taken svg {
    color: #c46b6b;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .input-hint {
    font-size: 0.75rem;
    color: #6a5a4a;
  }

  .input-error {
    font-size: 0.75rem;
    color: #c46b6b;
  }

  .error-message {
    padding: 0.75rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.3);
    border-radius: 6px;
    color: #e8a0a0;
    font-size: 0.85rem;
    text-align: center;
  }

  .note {
    margin: 1.5rem 0 0 0;
    padding-top: 1rem;
    border-top: 1px solid #3d3428;
    font-size: 0.8rem;
    color: #6a5a4a;
    text-align: center;
    line-height: 1.5;
  }
</style>
