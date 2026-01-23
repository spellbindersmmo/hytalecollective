<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase } from './supabase.js'

  let { onnavigate = () => {} } = $props()

  // Form state
  let displayName = $state('')
  let username = $state('')
  let bio = $state('')
  let website = $state('')
  let discordUsername = $state('')

  // Avatar state
  let avatarFile = $state(null)
  let avatarPreview = $state(null)

  // UI state
  let loading = $state(true)
  let saving = $state(false)
  let error = $state(null)
  let success = $state(null)
  let activeSection = $state('profile')

  onMount(() => {
    if (auth.profile) {
      loadProfile()
    }
  })

  function loadProfile() {
    loading = true
    displayName = auth.profile.display_name || ''
    username = auth.profile.username || ''
    bio = auth.profile.bio || ''
    website = auth.profile.website || ''
    discordUsername = auth.profile.discord_username || ''
    avatarPreview = auth.profile.avatar_url
    loading = false
  }

  function handleAvatarSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error = 'Please select a JPG, PNG, or WebP image.'
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      error = 'Image must be less than 2MB.'
      return
    }

    avatarFile = file

    const reader = new FileReader()
    reader.onload = (e) => {
      avatarPreview = e.target.result
    }
    reader.readAsDataURL(file)
  }

  async function saveProfile() {
    error = null
    success = null
    saving = true

    try {
      let avatarUrl = auth.profile.avatar_url

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const filePath = `${auth.user.id}/avatar-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        avatarUrl = data.publicUrl
      }

      // Update profile
      const updates = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        website: website.trim() || null,
        discord_username: discordUsername.trim() || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', auth.user.id)

      if (updateError) throw updateError

      // Refresh auth profile
      await auth.fetchProfile()
      avatarFile = null
      success = 'Profile updated successfully!'

    } catch (e) {
      console.error('Error saving profile:', e)
      error = e.message
    } finally {
      saving = false
    }
  }

  async function handleSignOut() {
    await auth.signOut()
    onnavigate('home')
  }
</script>

<div class="page">
  <Navbar currentPage="settings" {onnavigate} />

  <main class="main">
    <div class="container">
      <h1 class="page-title">Settings</h1>

      {#if !auth.isAuthenticated}
        <Panel>
          <div class="auth-required">
            <p>You must be logged in to access settings.</p>
          </div>
        </Panel>
      {:else if loading}
        <div class="loading">Loading...</div>
      {:else}
        <div class="settings-layout">
          <!-- Sidebar -->
          <nav class="settings-nav">
            <button
              class="nav-item"
              class:active={activeSection === 'profile'}
              onclick={() => activeSection = 'profile'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </button>
            <button
              class="nav-item"
              class:active={activeSection === 'account'}
              onclick={() => activeSection = 'account'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Account
            </button>
          </nav>

          <!-- Content -->
          <div class="settings-content">
            {#if activeSection === 'profile'}
              <Panel>
                <form class="settings-form" onsubmit={(e) => { e.preventDefault(); saveProfile(); }}>
                  <h2 class="section-title">Public Profile</h2>
                  <p class="section-description">This information will be visible on your public profile.</p>

                  <!-- Avatar -->
                  <div class="form-group avatar-group">
                    <label>Profile Picture</label>
                    <div class="avatar-editor">
                      <div class="avatar-preview">
                        {#if avatarPreview}
                          <img src={avatarPreview} alt="" />
                        {:else}
                          <span>{username.charAt(0).toUpperCase()}</span>
                        {/if}
                      </div>
                      <div class="avatar-actions">
                        <label class="upload-btn">
                          Change Photo
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onchange={handleAvatarSelect}
                            hidden
                          />
                        </label>
                        <small>JPG, PNG or WebP. Max 2MB.</small>
                      </div>
                    </div>
                  </div>

                  <!-- Display Name -->
                  <div class="form-group">
                    <label for="displayName">Display Name</label>
                    <input
                      type="text"
                      id="displayName"
                      bind:value={displayName}
                      placeholder="Your display name"
                      maxlength="50"
                      disabled={saving}
                    />
                    <small>This is shown instead of your username.</small>
                  </div>

                  <!-- Username (read-only) -->
                  <div class="form-group">
                    <label for="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      disabled
                      readonly
                    />
                    <small>Your unique username cannot be changed.</small>
                  </div>

                  <!-- Bio -->
                  <div class="form-group">
                    <label for="bio">Bio</label>
                    <textarea
                      id="bio"
                      bind:value={bio}
                      placeholder="Tell us about yourself..."
                      rows="3"
                      maxlength="500"
                      disabled={saving}
                    ></textarea>
                    <small>{bio.length}/500 characters</small>
                  </div>

                  <!-- Website -->
                  <div class="form-group">
                    <label for="website">Website</label>
                    <input
                      type="url"
                      id="website"
                      bind:value={website}
                      placeholder="https://yourwebsite.com"
                      disabled={saving}
                    />
                  </div>

                  <!-- Discord -->
                  <div class="form-group">
                    <label for="discord">Discord Username</label>
                    <input
                      type="text"
                      id="discord"
                      bind:value={discordUsername}
                      placeholder="username#0000"
                      disabled={saving}
                    />
                  </div>

                  {#if error}
                    <div class="error-message">{error}</div>
                  {/if}

                  {#if success}
                    <div class="success-message">{success}</div>
                  {/if}

                  <div class="form-actions">
                    <Button
                      variant="secondary"
                      onclick={() => onnavigate(`profile-${auth.profile.username}`)}
                      disabled={saving}
                    >
                      View Profile
                    </Button>
                    <Button variant="primary" type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </Panel>
            {:else if activeSection === 'account'}
              <Panel>
                <div class="settings-form">
                  <h2 class="section-title">Account</h2>
                  <p class="section-description">Manage your account settings.</p>

                  <div class="account-info">
                    <div class="info-row">
                      <span class="info-label">Email</span>
                      <span class="info-value">{auth.user?.email}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Account Created</span>
                      <span class="info-value">
                        {new Date(auth.profile?.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div class="danger-zone">
                    <h3>Sign Out</h3>
                    <p>Sign out of your account on this device.</p>
                    <Button variant="secondary" onclick={handleSignOut}>
                      Sign Out
                    </Button>
                  </div>
                </div>
              </Panel>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </main>

  <Footer {onnavigate} />
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main {
    flex: 1;
    padding: 2rem 1.5rem 3rem;
  }

  .container {
    max-width: 56rem;
    margin: 0 auto;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 2rem 0;
  }

  .loading {
    padding: 3rem;
    text-align: center;
    color: #8a7a6a;
  }

  .auth-required {
    padding: 2rem;
    text-align: center;
    color: #8a7a6a;
  }

  /* Settings Layout */
  .settings-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .settings-layout {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  .settings-nav {
    display: flex;
    gap: 0.5rem;
  }

  @media (min-width: 768px) {
    .settings-nav {
      flex-direction: column;
      width: 200px;
      flex-shrink: 0;
    }
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: #a89880;
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }

  .nav-item:hover {
    color: #c4b8a4;
    background: rgba(60, 50, 40, 0.3);
  }

  .nav-item.active {
    color: #d4a44c;
    background: rgba(212, 164, 76, 0.1);
    border-color: rgba(212, 164, 76, 0.3);
  }

  .nav-item svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .settings-content {
    flex: 1;
    min-width: 0;
  }

  /* Form Styles */
  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0;
  }

  .section-description {
    font-size: 0.9rem;
    color: #8a7a6a;
    margin: -0.5rem 0 0.5rem 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #c4b8a4;
  }

  .form-group small {
    font-size: 0.8rem;
    color: #6b5a48;
  }

  input[type="text"],
  input[type="url"],
  textarea {
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

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #d4a44c;
    box-shadow: 0 0 0 3px rgba(212, 164, 76, 0.15);
  }

  input::placeholder,
  textarea::placeholder {
    color: #6b5a48;
  }

  input:disabled,
  textarea:disabled {
    opacity: 0.6;
  }

  input[readonly] {
    background: rgba(0, 0, 0, 0.15);
    cursor: not-allowed;
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }

  /* Avatar Editor */
  .avatar-group {
    padding-bottom: 1rem;
    border-bottom: 1px solid #3d3428;
  }

  .avatar-editor {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .avatar-preview {
    width: 80px;
    height: 80px;
    border-radius: 10px;
    background: linear-gradient(180deg, #d4a44c 0%, #a67c28 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 2px solid #4a3f32;
  }

  .avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-preview span {
    font-family: 'Cinzel', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #1a1208;
  }

  .avatar-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .upload-btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: #d4a44c;
    background: rgba(212, 164, 76, 0.1);
    border: 1px solid rgba(212, 164, 76, 0.3);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .upload-btn:hover {
    background: rgba(212, 164, 76, 0.2);
  }

  .error-message {
    padding: 0.75rem 1rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid #c46b6b;
    border-radius: 6px;
    color: #e8a0a0;
    font-size: 0.85rem;
  }

  .success-message {
    padding: 0.75rem 1rem;
    background: rgba(126, 196, 123, 0.15);
    border: 1px solid #7ec47b;
    border-radius: 6px;
    color: #a8e8a5;
    font-size: 0.85rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #3d3428;
  }

  /* Account Section */
  .account-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .info-label {
    font-size: 0.9rem;
    color: #8a7a6a;
  }

  .info-value {
    font-size: 0.9rem;
    color: #c4b8a4;
  }

  .danger-zone {
    padding-top: 1.5rem;
    margin-top: 1rem;
    border-top: 1px solid #3d3428;
  }

  .danger-zone h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  .danger-zone p {
    font-size: 0.9rem;
    color: #8a7a6a;
    margin: 0 0 1rem 0;
  }
</style>
