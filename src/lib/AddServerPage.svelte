<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { createServer, addServerTags, fetchServerTags } from './stores/data.svelte.js'
  import { uploadFile, getStorageUrl } from './supabase.js'

  let { onnavigate = () => {} } = $props()

  // Form state
  let name = $state('')
  let description = $state('')
  let shortDescription = $state('')
  let ipAddress = $state('')
  let port = $state(25565)
  let website = $state('')
  let discordInvite = $state('')

  // Tags
  let availableTags = $state([])
  let selectedTags = $state([])

  // Images
  let bannerFile = $state(null)
  let iconFile = $state(null)
  let bannerPreview = $state(null)
  let iconPreview = $state(null)

  // UI state
  let submitting = $state(false)
  let error = $state(null)
  let success = $state(false)

  onMount(async () => {
    // Redirect if not logged in
    if (!auth.isAuthenticated) {
      onnavigate('servers')
      return
    }

    try {
      availableTags = await fetchServerTags()
    } catch (e) {
      console.error('Error loading tags:', e)
    }
  })

  function handleBannerSelect(e) {
    const file = e.target.files[0]
    if (file) {
      bannerFile = file
      bannerPreview = URL.createObjectURL(file)
    }
  }

  function handleIconSelect(e) {
    const file = e.target.files[0]
    if (file) {
      iconFile = file
      iconPreview = URL.createObjectURL(file)
    }
  }

  function toggleTag(tagId) {
    if (selectedTags.includes(tagId)) {
      selectedTags = selectedTags.filter(id => id !== tagId)
    } else if (selectedTags.length < 5) {
      selectedTags = [...selectedTags, tagId]
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    error = null
    submitting = true

    try {
      // Validate required fields
      if (!name.trim()) throw new Error('Server name is required')
      if (!ipAddress.trim()) throw new Error('IP address is required')
      if (!description.trim()) throw new Error('Description is required')

      let bannerPath = null
      let iconPath = null

      // Upload banner if provided
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop()
        const path = `banners/${auth.user.id}/${Date.now()}.${ext}`
        await uploadFile('servers', path, bannerFile)
        bannerPath = path
      }

      // Upload icon if provided
      if (iconFile) {
        const ext = iconFile.name.split('.').pop()
        const path = `icons/${auth.user.id}/${Date.now()}.${ext}`
        await uploadFile('servers', path, iconFile)
        iconPath = path
      }

      // Create server
      const server = await createServer({
        owner_id: auth.user.id,
        name: name.trim(),
        description: description.trim(),
        short_description: shortDescription.trim() || null,
        ip_address: ipAddress.trim(),
        port: parseInt(port) || 25565,
        website: website.trim() || null,
        discord_invite: discordInvite.trim() || null,
        banner_url: bannerPath,
        icon_url: iconPath,
        status: 'offline' // Will be updated when pinged
      })

      // Add tags if selected
      if (selectedTags.length > 0) {
        await addServerTags(server.id, selectedTags)
      }

      success = true

      // Redirect to server page after short delay
      setTimeout(() => {
        onnavigate(`server-${server.slug}`)
      }, 1500)

    } catch (e) {
      console.error('Error creating server:', e)
      error = e.message
    } finally {
      submitting = false
    }
  }
</script>

<div class="page">
  <Navbar currentPage="servers" {onnavigate} />

  <main class="main">
    <div class="container">
      <button class="back-link" onclick={() => onnavigate('servers')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Servers
      </button>

      <div class="page-header">
        <h1 class="page-title">Add Your Server</h1>
        <p class="page-subtitle">Submit your server to the community directory</p>
      </div>

      {#if success}
        <Panel>
          <div class="success-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h3>Server Added Successfully!</h3>
            <p>Redirecting to your server page...</p>
          </div>
        </Panel>
      {:else}
        <form class="form" onsubmit={handleSubmit}>
          {#if error}
            <div class="error-message">
              {error}
            </div>
          {/if}

          <Panel>
            <div class="form-section">
              <h2 class="section-title">Server Information</h2>

              <div class="form-group">
                <label for="name">Server Name *</label>
                <input
                  type="text"
                  id="name"
                  bind:value={name}
                  placeholder="My Awesome Server"
                  maxlength="100"
                  required
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="ip">IP Address *</label>
                  <input
                    type="text"
                    id="ip"
                    bind:value={ipAddress}
                    placeholder="play.example.com"
                    required
                  />
                </div>

                <div class="form-group form-group-small">
                  <label for="port">Port</label>
                  <input
                    type="number"
                    id="port"
                    bind:value={port}
                    min="1"
                    max="65535"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="shortDesc">Short Description</label>
                <input
                  type="text"
                  id="shortDesc"
                  bind:value={shortDescription}
                  placeholder="A brief tagline for your server"
                  maxlength="150"
                />
                <span class="hint">Shown in server cards (max 150 chars)</span>
              </div>

              <div class="form-group">
                <label for="description">Full Description *</label>
                <textarea
                  id="description"
                  bind:value={description}
                  placeholder="Describe your server, its features, game modes, community..."
                  rows="5"
                  required
                ></textarea>
              </div>
            </div>
          </Panel>

          <Panel>
            <div class="form-section">
              <h2 class="section-title">Links</h2>

              <div class="form-group">
                <label for="website">Website URL</label>
                <input
                  type="url"
                  id="website"
                  bind:value={website}
                  placeholder="https://your-server.com"
                />
              </div>

              <div class="form-group">
                <label for="discord">Discord Invite</label>
                <input
                  type="text"
                  id="discord"
                  bind:value={discordInvite}
                  placeholder="https://discord.gg/invite-code"
                />
              </div>
            </div>
          </Panel>

          <Panel>
            <div class="form-section">
              <h2 class="section-title">Branding</h2>

              <div class="form-row">
                <div class="form-group">
                  <label>Server Icon</label>
                  <div class="image-upload">
                    {#if iconPreview}
                      <img src={iconPreview} alt="Icon preview" class="icon-preview" />
                    {:else}
                      <div class="upload-placeholder icon-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>64x64 px</span>
                      </div>
                    {/if}
                    <input type="file" accept="image/*" onchange={handleIconSelect} />
                  </div>
                </div>

                <div class="form-group form-group-large">
                  <label>Server Banner</label>
                  <div class="image-upload banner-upload">
                    {#if bannerPreview}
                      <img src={bannerPreview} alt="Banner preview" class="banner-preview" />
                    {:else}
                      <div class="upload-placeholder banner-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>Recommended: 1200x300 px</span>
                      </div>
                    {/if}
                    <input type="file" accept="image/*" onchange={handleBannerSelect} />
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <div class="form-section">
              <h2 class="section-title">Tags</h2>
              <p class="section-hint">Select up to 5 tags that describe your server</p>

              <div class="tags-grid">
                {#each availableTags as tag}
                  <button
                    type="button"
                    class="tag-btn"
                    class:selected={selectedTags.includes(tag.id)}
                    style="--tag-color: {tag.color}"
                    onclick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                {/each}
              </div>
            </div>
          </Panel>

          <div class="form-actions">
            <Button variant="secondary" onclick={() => onnavigate('servers')}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Server'}
            </Button>
          </div>
        </form>
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
    max-width: 50rem;
    margin: 0 auto;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    background: none;
    border: none;
    color: #8a7a6a;
    font-size: 0.9rem;
    cursor: pointer;
    margin-bottom: 1.5rem;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: #c4b8a4;
  }

  .back-link svg {
    width: 18px;
    height: 18px;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .page-subtitle {
    font-size: 1rem;
    color: #a89880;
    margin: 0.25rem 0 0 0;
  }

  /* Form */
  .form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-section {
    padding: 0.5rem;
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #c4b8a4;
    margin: 0 0 1rem 0;
  }

  .section-hint {
    font-size: 0.85rem;
    color: #8a7a6a;
    margin: -0.5rem 0 1rem 0;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    color: #c4b8a4;
    margin-bottom: 0.5rem;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #f0e6d8;
    font-size: 0.95rem;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #6bb8cc;
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #6a5a4a;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 100px;
  }

  .hint {
    display: block;
    font-size: 0.75rem;
    color: #6a5a4a;
    margin-top: 0.35rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-group-small {
    flex: 0 0 120px !important;
  }

  .form-group-large {
    flex: 2 !important;
  }

  /* Image uploads */
  .image-upload {
    position: relative;
  }

  .image-upload input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 2px dashed #3d3428;
    border-radius: 4px;
    color: #6a5a4a;
    font-size: 0.75rem;
    transition: all 0.15s;
  }

  .image-upload:hover .upload-placeholder {
    border-color: #6b5a48;
    color: #8a7a6a;
  }

  .upload-placeholder svg {
    width: 32px;
    height: 32px;
  }

  .icon-placeholder {
    width: 80px;
    height: 80px;
  }

  .banner-placeholder {
    height: 100px;
  }

  .icon-preview {
    width: 80px;
    height: 80px;
    border-radius: 4px;
    object-fit: cover;
  }

  .banner-preview {
    width: 100%;
    height: 100px;
    border-radius: 4px;
    object-fit: cover;
  }

  /* Tags */
  .tags-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-btn {
    padding: 0.4rem 0.8rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #c4b8a4;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tag-btn:hover {
    border-color: var(--tag-color, #6b5a48);
    color: #f0e6d8;
  }

  .tag-btn.selected {
    background: color-mix(in srgb, var(--tag-color, #6b5a48) 20%, transparent);
    border-color: var(--tag-color, #6b5a48);
    color: var(--tag-color, #f0e6d8);
  }

  /* Actions */
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  /* Messages */
  .error-message {
    padding: 1rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.3);
    border-radius: 4px;
    color: #e8a8a8;
    font-size: 0.9rem;
  }

  .success-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 2rem;
    text-align: center;
  }

  .success-message svg {
    width: 64px;
    height: 64px;
    color: #7ec47b;
    margin-bottom: 1rem;
  }

  .success-message h3 {
    font-size: 1.25rem;
    color: #7ec47b;
    margin: 0 0 0.5rem 0;
  }

  .success-message p {
    color: #8a7a6a;
    margin: 0;
  }

  @media (max-width: 640px) {
    .form-row {
      flex-direction: column;
    }

    .form-group-small,
    .form-group-large {
      flex: 1 !important;
    }
  }
</style>
