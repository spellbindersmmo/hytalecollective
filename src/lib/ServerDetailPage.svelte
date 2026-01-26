<script>
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase } from './supabase.js'
  import { fetchServerBySlug, voteForServer, checkUserVote } from './stores/data.svelte.js'

  let { serverSlug = '', onnavigate = () => {} } = $props()

  // State
  let server = $state(null)
  let loading = $state(true)
  let error = $state(null)
  let hasVotedToday = $state(false)
  let voting = $state(false)
  let voteError = $state(null)
  let copied = $state(false)

  // Owner panel state
  let showOwnerPanel = $state(false)
  let verifyingWebsite = $state(false)
  let verificationMessage = $state(null)
  let copiedVerification = $state(false)

  // Check if current user is the server owner
  const isOwner = $derived(
    auth.isAuthenticated && server && server.owner_id === auth.user?.id
  )

  // Source badge configuration
  const sourceConfig = {
    community: { label: 'Community', color: '#6bb8cc' },
    official: { label: 'Official', color: '#d4a44c' },
    partner: { label: 'Partner', color: '#9b6dc6' }
  }

  // Use $effect to react to serverSlug prop changes
  // This runs on mount AND whenever serverSlug changes
  $effect(() => {
    if (serverSlug) {
      loadServer()
    }
  })

  async function loadServer() {
    loading = true
    error = null

    try {
      server = await fetchServerBySlug(serverSlug)

      // Check if user has voted today
      if (auth.isAuthenticated) {
        hasVotedToday = await checkUserVote(server.id)
      }
    } catch (e) {
      console.error('Error loading server:', e)
      error = 'Server not found'
    } finally {
      loading = false
    }
  }

  async function handleVote() {
    if (!auth.isAuthenticated) {
      auth.openModal()
      return
    }

    if (hasVotedToday || voting) return

    voting = true
    voteError = null

    try {
      await voteForServer(server.id)
      hasVotedToday = true
      server.total_votes++
    } catch (e) {
      voteError = e.message
    } finally {
      voting = false
    }
  }

  function copyIP() {
    const ip = server.port !== 25565
      ? `${server.ip_address}:${server.port}`
      : server.ip_address

    navigator.clipboard.writeText(ip)
    copied = true
    setTimeout(() => copied = false, 2000)
  }

  const sourceBadge = $derived(
    server ? (sourceConfig[server.source] || sourceConfig.community) : null
  )

  const displayIP = $derived(
    server
      ? (server.port !== 25565 ? `${server.ip_address}:${server.port}` : server.ip_address)
      : ''
  )

  // Verify website ownership
  async function verifyWebsite() {
    if (!isOwner || !server.website || verifyingWebsite) return

    verifyingWebsite = true
    verificationMessage = null

    try {
      // Try to fetch the verification file from their website
      const verifyUrl = new URL('/.well-known/hytale-collective.txt', server.website).href

      const response = await fetch(verifyUrl, {
        mode: 'cors',
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Could not find verification file. Make sure the file exists at ' + verifyUrl)
      }

      const content = await response.text()
      const expectedCode = server.verification_code

      if (content.trim().includes(expectedCode)) {
        // Verification successful!
        const { error: updateError } = await supabase
          .from('servers')
          .update({
            website_verified: true,
            website_verified_at: new Date().toISOString()
          })
          .eq('id', server.id)

        if (updateError) throw updateError

        server.website_verified = true
        server.website_verified_at = new Date().toISOString()

        verificationMessage = { type: 'success', text: 'Website verified successfully!' }
      } else {
        throw new Error('Verification code not found in file. Make sure the file contains: ' + expectedCode)
      }
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('CORS')) {
        verificationMessage = {
          type: 'error',
          text: 'Could not access your website. Make sure the file is publicly accessible and CORS is enabled, or the file exists at the correct location.'
        }
      } else {
        verificationMessage = { type: 'error', text: e.message }
      }
    } finally {
      verifyingWebsite = false
    }
  }

  // Copy verification code
  function copyVerificationCode() {
    if (!server?.verification_code) return
    navigator.clipboard.writeText(server.verification_code)
    copiedVerification = true
    setTimeout(() => copiedVerification = false, 2000)
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

      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading server...</p>
        </div>
      {:else if error}
        <Panel>
          <div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3>Server Not Found</h3>
            <p>The server you're looking for doesn't exist or has been removed.</p>
            <Button variant="primary" onclick={() => onnavigate('servers')}>
              Browse Servers
            </Button>
          </div>
        </Panel>
      {:else if server}
        <!-- Banner -->
        {#if server.banner}
          <div class="banner">
            <img src={server.banner} alt="{server.name} banner" />
            <div class="banner-overlay"></div>
          </div>
        {/if}

        <div class="content-layout" class:has-banner={server.banner}>
          <!-- Main Content -->
          <div class="main-content">
            <Panel>
              <div class="server-header">
                <div class="header-left">
                  {#if server.icon}
                    <img src={server.icon} alt="{server.name} icon" class="server-icon" />
                  {:else}
                    <div class="server-icon-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" />
                        <line x1="6" y1="18" x2="6.01" y2="18" />
                      </svg>
                    </div>
                  {/if}

                  <div class="header-info">
                    <div class="title-row">
                      <h1 class="server-name">{server.name}</h1>
                      <div class="source-badge" style="--badge-color: {sourceBadge.color}">
                        {sourceBadge.label}
                      </div>
                    </div>

                    <div class="server-status" class:online={server.status === 'online'} class:pending={server.status === 'pending'}>
                      <span class="status-dot"></span>
                      <span class="status-text">
                        {server.status === 'online' ? 'Online' : server.status === 'pending' ? 'N/A' : 'Offline'}
                      </span>
                      <span class="player-count">
                        {#if server.status === 'pending'}
                          No query plugin detected
                        {:else}
                          {server.current_players}/{server.max_players} players
                        {/if}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel>
              <div class="ip-section">
                <span class="ip-label">Server Address</span>
                <div class="ip-row">
                  <code class="ip-value">{displayIP}</code>
                  <button class="copy-btn" onclick={copyIP}>
                    {#if copied}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    {:else}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    {/if}
                  </button>
                </div>
              </div>
            </Panel>

            {#if server.tags && server.tags.length > 0}
              <Panel>
                <div class="tags-section">
                  <h3 class="section-label">Tags</h3>
                  <div class="tags-list">
                    {#each server.tags as tag}
                      <span class="tag" style="--tag-color: {tag.color}">{tag.name}</span>
                    {/each}
                  </div>
                </div>
              </Panel>
            {/if}

            <Panel>
              <div class="description-section">
                <h3 class="section-label">About</h3>
                <div class="description">
                  {server.description || 'No description provided.'}
                </div>
              </div>
            </Panel>

            {#if server.owner}
              <Panel>
                <div class="owner-section">
                  <h3 class="section-label">Server Owner</h3>
                  <button
                    class="owner-card"
                    onclick={() => onnavigate(`profile-${server.owner.username}`)}
                  >
                    {#if server.owner.avatar_url?.startsWith('http')}
                      <img src={server.owner.avatar_url} alt={server.owner.username} class="owner-avatar" />
                    {:else}
                      <div class="owner-avatar-placeholder">
                        {server.owner.username.charAt(0).toUpperCase()}
                      </div>
                    {/if}
                    <span class="owner-name">{server.owner.username}</span>
                  </button>
                </div>
              </Panel>
            {/if}
          </div>

          <!-- Sidebar -->
          <aside class="sidebar">
            <Panel>
              <div class="vote-section">
                <div class="vote-count">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span class="count">{server.total_votes}</span>
                  <span class="label">votes</span>
                </div>

                <Button
                  variant={hasVotedToday ? 'secondary' : 'primary'}
                  onclick={handleVote}
                  disabled={hasVotedToday || voting}
                  fullWidth
                >
                  {#if voting}
                    Voting...
                  {:else if hasVotedToday}
                    Voted Today
                  {:else}
                    Vote for Server
                  {/if}
                </Button>

                {#if voteError}
                  <p class="vote-error">{voteError}</p>
                {/if}

                {#if !auth.isAuthenticated}
                  <button class="vote-hint-btn" onclick={() => auth.openModal()}>
                    Login to vote for this server
                  </button>
                {/if}
              </div>
            </Panel>

            {#if server.website || server.discord_invite}
              <Panel>
                <div class="links-section">
                  <h3 class="section-label">Links</h3>

                  {#if server.website}
                    <a href={server.website} target="_blank" rel="noopener noreferrer" class="link-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      Website
                    </a>
                  {/if}

                  {#if server.discord_invite}
                    <a href={server.discord_invite} target="_blank" rel="noopener noreferrer" class="link-btn discord">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Discord
                    </a>
                  {/if}
                </div>
              </Panel>
            {/if}


            <Panel>
              <div class="stats-section">
                <h3 class="section-label">Statistics</h3>
                <div class="stat-row">
                  <span class="stat-label">Views</span>
                  <span class="stat-value">{server.view_count || 0}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Added</span>
                  <span class="stat-value">{new Date(server.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Panel>

            <!-- Owner Verification Panel -->
            {#if isOwner}
              <Panel>
                <div class="owner-panel">
                  <button
                    class="owner-panel-header"
                    onclick={() => showOwnerPanel = !showOwnerPanel}
                  >
                    <h3 class="section-label">Server Management</h3>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      class="chevron"
                      class:expanded={showOwnerPanel}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {#if showOwnerPanel}
                    <div class="owner-panel-content">
                      {#if verificationMessage}
                        <div class="verification-message" class:success={verificationMessage.type === 'success'} class:error={verificationMessage.type === 'error'}>
                          {verificationMessage.text}
                        </div>
                      {/if}

                      <!-- Server Status Info -->
                      <div class="verification-section">
                        {#if server.status === 'pending'}
                          <h4>Enable Status & Player Count</h4>
                          <p class="hint">Your server shows as "N/A" because we can't detect its status. Install the HyQuery plugin to display player count and online status.</p>

                          <div class="setup-steps">
                            <div class="setup-step">
                              <span class="step-number">1</span>
                              <div class="step-content">
                                <p><strong>Download the plugin</strong></p>
                                <a href="/downloads/hyquery.jar" download class="plugin-download-btn">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  Download HyQuery.jar
                                </a>
                              </div>
                            </div>

                            <div class="setup-step">
                              <span class="step-number">2</span>
                              <div class="step-content">
                                <p><strong>Install on your server</strong></p>
                                <p class="step-desc">Place <code>hyquery.jar</code> in your server's <code>plugins</code> folder.</p>
                              </div>
                            </div>

                            <div class="setup-step">
                              <span class="step-number">3</span>
                              <div class="step-content">
                                <p><strong>Restart your server</strong></p>
                                <p class="step-desc">The plugin starts automatically. We'll detect your server within a few minutes.</p>
                              </div>
                            </div>
                          </div>

                          <p class="setup-note">The plugin uses UDP on your game port - no additional ports needed.</p>
                        {:else}
                          <h4>Server Status</h4>
                          <div class="status-info" class:online={server.status === 'online'}>
                            <span class="status-indicator-large"></span>
                            <div class="status-details">
                              <span class="status-label">{server.status === 'online' ? 'Online' : 'Offline'}</span>
                              <span class="status-hint">Status detected via query plugin</span>
                            </div>
                          </div>

                          <details class="plugin-details">
                            <summary>Need to reinstall the query plugin?</summary>
                            <div class="plugin-details-content">
                              <a href="/downloads/hyquery.jar" download class="plugin-download-btn-small">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download HyQuery.jar
                              </a>
                              <p>Place in your server's <code>plugins</code> folder and restart.</p>
                            </div>
                          </details>
                        {/if}
                      </div>

                      <!-- Website Verification -->
                      {#if server.website}
                        <div class="verification-section">
                          <h4>
                            Website Verification
                            {#if server.website_verified}
                              <span class="verified-badge">Verified</span>
                            {/if}
                          </h4>

                          {#if !server.website_verified}
                            <p class="hint">Verify you own this website by placing a file at:</p>
                            <code class="file-path">{server.website}/.well-known/hytale-collective.txt</code>

                            <p class="hint">The file should contain:</p>
                            <div class="code-block">
                              <code>{server.verification_code}</code>
                              <button class="copy-small" onclick={copyVerificationCode}>
                                {copiedVerification ? 'Copied!' : 'Copy'}
                              </button>
                            </div>

                            <Button
                              variant="secondary"
                              onclick={verifyWebsite}
                              disabled={verifyingWebsite}
                              fullWidth
                            >
                              {verifyingWebsite ? 'Verifying...' : 'Verify Website'}
                            </Button>
                          {:else}
                            <p class="success-text">Your website has been verified!</p>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              </Panel>
            {/if}
          </aside>
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
    max-width: 80rem;
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

  /* Banner */
  .banner {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 7;
    min-height: 220px;
    max-height: 360px;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: -80px;
  }

  .banner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 40%, rgba(22, 18, 14, 0.95) 100%);
  }

  /* Layout */
  .content-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .content-layout.has-banner {
    padding-top: 60px;
  }

  @media (min-width: 1024px) {
    .content-layout {
      grid-template-columns: 1fr 320px;
    }
  }

  .main-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Server Header */
  .server-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.5rem;
  }

  .header-left {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .server-icon,
  .server-icon-placeholder {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .server-icon {
    object-fit: cover;
    border: 1px solid #4a3f32;
  }

  .server-icon-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    color: #6a5a4a;
  }

  .server-icon-placeholder svg {
    width: 32px;
    height: 32px;
  }

  .header-info {
    flex: 1;
  }

  .title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .server-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .source-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--badge-color);
    background: color-mix(in srgb, var(--badge-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--badge-color) 40%, transparent);
    border-radius: 3px;
  }

  .server-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c46b6b;
  }

  .server-status.online .status-dot {
    background: #7ec47b;
  }

  .status-text {
    font-size: 0.85rem;
    color: #c46b6b;
    font-weight: 500;
  }

  .server-status.online .status-text {
    color: #7ec47b;
  }

  .server-status.pending .status-dot {
    background: #d4a44c;
  }

  .server-status.pending .status-text {
    color: #d4a44c;
  }

  .player-count {
    font-size: 0.85rem;
    color: #8a7a6a;
  }

  /* IP Section */
  .ip-section {
    padding: 0.5rem;
  }

  .ip-label {
    display: block;
    font-size: 0.75rem;
    color: #8a7a6a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .ip-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .ip-value {
    flex: 1;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #6bb8cc;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
  }

  .copy-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #c4b8a4;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .copy-btn:hover {
    border-color: #6b5a48;
    color: #f0e6d8;
  }

  .copy-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Sections */
  .section-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #8a7a6a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.75rem 0;
  }

  .tags-section,
  .description-section,
  .owner-section,
  .vote-section,
  .links-section,
  .stats-section {
    padding: 0.5rem;
  }

  /* Tags */
  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
    color: var(--tag-color, #c4b8a4);
    background: color-mix(in srgb, var(--tag-color, #6b5a48) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--tag-color, #6b5a48) 40%, transparent);
    border-radius: 3px;
  }

  /* Description */
  .description {
    font-size: 0.95rem;
    color: #c4b8a4;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  /* Owner */
  .owner-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .owner-card:hover {
    border-color: #4a3f32;
  }

  .owner-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .owner-avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(180deg, #4a3f32 0%, #3a3127 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c4b8a4;
    font-weight: 600;
  }

  .owner-name {
    font-size: 0.95rem;
    color: #f0e6d8;
  }

  /* Vote Section */
  .vote-count {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1rem;
  }

  .vote-count svg {
    width: 32px;
    height: 32px;
    color: #d4a44c;
    margin-bottom: 0.25rem;
  }

  .vote-count .count {
    font-size: 1.5rem;
    font-weight: 700;
    color: #d4a44c;
  }

  .vote-count .label {
    font-size: 0.75rem;
    color: #8a7a6a;
    text-transform: uppercase;
  }

  .vote-error {
    font-size: 0.8rem;
    color: #c46b6b;
    text-align: center;
    margin: 0.5rem 0 0;
  }

  .vote-hint-btn {
    display: block;
    width: 100%;
    padding: 0.5rem;
    font-size: 0.8rem;
    color: #d4a44c;
    background: none;
    border: none;
    text-align: center;
    margin: 0.5rem 0 0;
    cursor: pointer;
    transition: color 0.15s;
  }

  .vote-hint-btn:hover {
    color: #e8c36b;
    text-decoration: underline;
  }

  /* Links */
  .link-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 1rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #c4b8a4;
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.15s;
    margin-bottom: 0.5rem;
  }

  .link-btn:last-child {
    margin-bottom: 0;
  }

  .link-btn:hover {
    border-color: #4a3f32;
    color: #f0e6d8;
  }

  .link-btn svg {
    width: 18px;
    height: 18px;
  }

  .link-btn.discord {
    color: #5865F2;
  }

  .link-btn.discord:hover {
    color: #7289DA;
  }

  /* Stats */
  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #3d3428;
  }

  .stat-row:last-child {
    border-bottom: none;
  }

  .stat-label {
    color: #8a7a6a;
    font-size: 0.85rem;
  }

  .stat-value {
    color: #c4b8a4;
    font-size: 0.85rem;
  }

  /* Loading & Error */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 2rem;
    color: #8a7a6a;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #3d3428;
    border-top-color: #6bb8cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 2rem;
    text-align: center;
  }

  .error-state svg {
    width: 64px;
    height: 64px;
    color: #c46b6b;
    margin-bottom: 1rem;
  }

  .error-state h3 {
    font-size: 1.25rem;
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  .error-state p {
    color: #8a7a6a;
    margin: 0 0 1.5rem 0;
  }

  /* Owner Panel */
  .owner-panel {
    padding: 0.5rem;
  }

  .owner-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
  }

  .owner-panel-header .section-label {
    margin: 0;
  }

  .owner-panel-header .chevron {
    width: 20px;
    height: 20px;
    color: #8a7a6a;
    transition: transform 0.2s;
  }

  .owner-panel-header .chevron.expanded {
    transform: rotate(180deg);
  }

  .owner-panel-content {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .verification-section {
    padding-top: 1rem;
    border-top: 1px solid #3d3428;
  }

  .verification-section:first-child {
    padding-top: 0;
    border-top: none;
  }

  .verification-section h4 {
    font-size: 0.9rem;
    font-weight: 600;
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .plugin-download-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, rgba(107, 184, 204, 0.2) 0%, rgba(107, 184, 204, 0.1) 100%);
    border: 1px solid rgba(107, 184, 204, 0.4);
    border-radius: 4px;
    color: #6bb8cc;
    font-size: 0.9rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.15s;
  }

  .plugin-download-btn:hover {
    background: linear-gradient(180deg, rgba(107, 184, 204, 0.3) 0%, rgba(107, 184, 204, 0.15) 100%);
    border-color: rgba(107, 184, 204, 0.6);
  }

  .plugin-download-btn svg {
    width: 18px;
    height: 18px;
  }

  .setup-steps {
    margin: 0.75rem 0;
  }

  .setup-step {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }

  .setup-step:last-child {
    margin-bottom: 0;
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: rgba(107, 184, 204, 0.2);
    border: 1px solid rgba(107, 184, 204, 0.4);
    border-radius: 50%;
    color: #6bb8cc;
    font-size: 0.7rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-content p {
    margin: 0;
    font-size: 0.8rem;
    color: #c4b8a4;
  }

  .step-content .step-desc {
    margin-top: 0.2rem;
    font-size: 0.75rem;
    color: #8a7a6a;
  }

  .step-content code {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.7rem;
    color: #6bb8cc;
  }

  .step-content .plugin-download-btn {
    margin-top: 0.4rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }

  .setup-note {
    margin: 0.75rem 0 0 0;
    padding: 0.5rem 0.6rem;
    background: rgba(126, 196, 123, 0.1);
    border: 1px solid rgba(126, 196, 123, 0.2);
    border-radius: 4px;
    font-size: 0.75rem;
    color: #7ec47b;
  }

  .status-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(196, 107, 107, 0.1);
    border: 1px solid rgba(196, 107, 107, 0.2);
    border-radius: 6px;
    margin-bottom: 0.75rem;
  }

  .status-info.online {
    background: rgba(126, 196, 123, 0.1);
    border-color: rgba(126, 196, 123, 0.2);
  }

  .status-indicator-large {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #c46b6b;
    box-shadow: 0 0 8px rgba(196, 107, 107, 0.5);
  }

  .status-info.online .status-indicator-large {
    background: #7ec47b;
    box-shadow: 0 0 8px rgba(126, 196, 123, 0.5);
  }

  .status-details {
    display: flex;
    flex-direction: column;
  }

  .status-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #c46b6b;
  }

  .status-info.online .status-label {
    color: #7ec47b;
  }

  .status-hint {
    font-size: 0.75rem;
    color: #8a7a6a;
  }

  .plugin-details {
    margin-top: 0.5rem;
  }

  .plugin-details summary {
    font-size: 0.8rem;
    color: #8a7a6a;
    cursor: pointer;
  }

  .plugin-details summary:hover {
    color: #a89880;
  }

  .plugin-details-content {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .plugin-details-content p {
    margin: 0.5rem 0 0 0;
    font-size: 0.75rem;
    color: #8a7a6a;
  }

  .plugin-details-content code {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.7rem;
    color: #6bb8cc;
  }

  .plugin-download-btn-small {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: linear-gradient(180deg, rgba(107, 184, 204, 0.15) 0%, rgba(107, 184, 204, 0.08) 100%);
    border: 1px solid rgba(107, 184, 204, 0.3);
    border-radius: 4px;
    color: #6bb8cc;
    font-size: 0.75rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.15s;
  }

  .plugin-download-btn-small:hover {
    background: linear-gradient(180deg, rgba(107, 184, 204, 0.25) 0%, rgba(107, 184, 204, 0.12) 100%);
    border-color: rgba(107, 184, 204, 0.5);
  }

  .plugin-download-btn-small svg {
    width: 14px;
    height: 14px;
  }

  .verification-section .hint {
    font-size: 0.8rem;
    color: #8a7a6a;
    margin: 0 0 0.75rem 0;
    line-height: 1.4;
  }

  .verification-section .form-group {
    margin-bottom: 0.75rem;
  }

  .verification-section .form-group label {
    display: block;
    font-size: 0.75rem;
    color: #8a7a6a;
    margin-bottom: 0.25rem;
  }

  .verification-section .form-group input,
  .verification-section .form-group select {
    width: 100%;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #f0e6d8;
    font-size: 0.85rem;
  }

  .verification-section .form-group input:focus,
  .verification-section .form-group select:focus {
    outline: none;
    border-color: #d4a44c;
  }

  .verification-section .form-row {
    display: flex;
    gap: 0.75rem;
  }

  .verification-section .form-row .form-group {
    flex: 1;
  }

  .verified-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    background: rgba(126, 196, 123, 0.2);
    border: 1px solid rgba(126, 196, 123, 0.4);
    border-radius: 3px;
    color: #7ec47b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .file-path {
    display: block;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #3d3428;
    border-radius: 4px;
    font-size: 0.7rem;
    color: #6bb8cc;
    word-break: break-all;
    margin-bottom: 0.75rem;
  }

  .code-block {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #3d3428;
    border-radius: 4px;
    margin-bottom: 0.75rem;
  }

  .code-block code {
    flex: 1;
    font-size: 0.75rem;
    color: #d4a44c;
    word-break: break-all;
  }

  .copy-small {
    padding: 0.25rem 0.5rem;
    background: rgba(212, 164, 76, 0.15);
    border: 1px solid rgba(212, 164, 76, 0.3);
    border-radius: 3px;
    color: #d4a44c;
    font-size: 0.7rem;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .copy-small:hover {
    background: rgba(212, 164, 76, 0.25);
    border-color: rgba(212, 164, 76, 0.5);
  }

  .success-text {
    font-size: 0.85rem;
    color: #7ec47b;
    margin: 0;
  }

  .verification-message {
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .verification-message.success {
    background: rgba(126, 196, 123, 0.15);
    border: 1px solid rgba(126, 196, 123, 0.3);
    color: #7ec47b;
  }

  .verification-message.error {
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.3);
    color: #e8a8a8;
  }
</style>
