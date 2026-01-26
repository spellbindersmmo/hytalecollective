<script>
  import { marked } from 'marked'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import DiscussionSection from './DiscussionSection.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { addFavorite, removeFavorite, checkFavorite } from './stores/data.svelte.js'
  import {
    getProject,
    formatDownloads,
    formatRating,
    getProjectUrl,
    getDownloadUrl,
    getLatestVersion,
    classificationOptions
  } from './modtale.js'

  // Configure marked for safe rendering
  marked.setOptions({
    breaks: true,
    gfm: true
  })

  let { modSlug = '', onnavigate = () => {} } = $props()

  // State
  let mod = $state(null)
  let loading = $state(true)
  let error = $state(null)
  let isFavorited = $state(false)
  let favoriting = $state(false)
  let lightboxIndex = $state(null)

  // Lightbox helpers
  const lightboxImage = $derived(
    lightboxIndex !== null && mod?.gallery?.[lightboxIndex]
      ? (mod.gallery[lightboxIndex].url || mod.gallery[lightboxIndex])
      : null
  )

  function openLightbox(index) {
    lightboxIndex = index
    document.addEventListener('keydown', handleLightboxKeydown)
  }

  function closeLightbox() {
    lightboxIndex = null
    document.removeEventListener('keydown', handleLightboxKeydown)
  }

  function nextImage() {
    if (mod?.gallery && lightboxIndex < mod.gallery.length - 1) {
      lightboxIndex++
    }
  }

  function prevImage() {
    if (lightboxIndex > 0) {
      lightboxIndex--
    }
  }

  function handleLightboxKeydown(e) {
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowRight') nextImage()
    if (e.key === 'ArrowLeft') prevImage()
  }

  // Classification badge colors
  const classificationColors = {
    PLUGIN: '#6bb8cc',
    DATA: '#9b6dc6',
    ART: '#d4a44c',
    SAVE: '#7ec47b',
    MODPACK: '#cc6b8e'
  }

  $effect(() => {
    if (modSlug) {
      loadMod()
    }
  })

  async function loadMod() {
    loading = true
    error = null

    try {
      mod = await getProject(modSlug)
      // Check if mod is favorited (using slug as identifier)
      if (auth.isAuthenticated && mod) {
        isFavorited = await checkFavorite('mod', mod.slug)
      }
    } catch (e) {
      console.error('Error loading mod:', e)
      error = 'Mod not found'
    } finally {
      loading = false
    }
  }

  async function toggleFavorite() {
    if (!auth.isAuthenticated) {
      auth.openModal()
      return
    }
    if (favoriting) return

    favoriting = true
    try {
      if (isFavorited) {
        await removeFavorite('mod', mod.slug)
        isFavorited = false
      } else {
        await addFavorite('mod', mod.slug)
        isFavorited = true
      }
    } catch (e) {
      console.error('Error toggling favorite:', e)
    } finally {
      favoriting = false
    }
  }

  function getClassificationLabel(classification) {
    const option = classificationOptions.find(o => o.value === classification)
    return option ? option.label : classification
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const latestVersion = $derived(mod ? getLatestVersion(mod) : null)
  const badgeColor = $derived(mod ? (classificationColors[mod.classification] || '#6bb8cc') : '#6bb8cc')
  const renderedDescription = $derived(mod?.description ? marked.parse(mod.description) : '')
</script>

<div class="page">
  <Navbar currentPage="mods" {onnavigate} />

  <main class="main">
    <div class="container">
      <button class="back-link" onclick={() => onnavigate('mods')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Mods
      </button>

      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading mod...</p>
        </div>
      {:else if error}
        <Panel>
          <div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3>Mod Not Found</h3>
            <p>The mod you're looking for doesn't exist or has been removed.</p>
            <Button variant="primary" onclick={() => onnavigate('mods')}>
              Browse Mods
            </Button>
          </div>
        </Panel>
      {:else if mod}
        <div class="content-layout">
          <!-- Main Content -->
          <div class="main-content">
            <Panel>
              <div class="mod-header">
                <div class="header-left">
                  {#if mod.iconUrl}
                    <img src={mod.iconUrl} alt="{mod.title} icon" class="mod-icon" />
                  {:else}
                    <div class="mod-icon-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                  {/if}

                  <div class="header-info">
                    <div class="title-row">
                      <h1 class="mod-name">{mod.title}</h1>
                      <div class="type-badge" style="--badge-color: {badgeColor}">
                        {getClassificationLabel(mod.classification)}
                      </div>
                    </div>

                    <div class="mod-meta">
                      <span class="author">by {mod.author}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            {#if mod.tags && mod.tags.length > 0}
              <Panel>
                <div class="tags-section">
                  <h3 class="section-label">Tags</h3>
                  <div class="tags-list">
                    {#each mod.tags as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                </div>
              </Panel>
            {/if}

            <Panel>
              <div class="description-section">
                <h3 class="section-label">About</h3>
                <div class="description markdown-content">
                  {#if mod.about || mod.description}
                    {@html marked.parse(mod.about || mod.description)}
                  {:else}
                    No description provided.
                  {/if}
                </div>
              </div>
            </Panel>

            {#if mod.versions && mod.versions.length > 0}
              <Panel>
                <div class="versions-section">
                  <h3 class="section-label">Versions</h3>
                  <div class="versions-list">
                    {#each mod.versions.slice(0, 5) as version}
                      <div class="version-row">
                        <div class="version-info">
                          <span class="version-number">{version.versionNumber || version.version}</span>
                          <span class="version-date">{formatDate(version.createdAt || version.uploadedAt)}</span>
                          {#if version.gameVersions && version.gameVersions.length > 0}
                            <span class="game-versions">
                              {version.gameVersions.join(', ')}
                            </span>
                          {/if}
                        </div>
                        <a
                          href={getDownloadUrl(mod.id, version.versionNumber || version.version || version.id)}
                          class="version-download"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </a>
                      </div>
                    {/each}
                  </div>
                </div>
              </Panel>
            {/if}

            {#if mod.gallery && mod.gallery.length > 0}
              <Panel>
                <div class="gallery-section">
                  <h3 class="section-label">Gallery</h3>
                  <div class="gallery-grid">
                    {#each mod.gallery as image, index}
                      <button
                        class="gallery-item"
                        onclick={() => openLightbox(index)}
                      >
                        <img src={image.url || image} alt="Gallery" class="gallery-image" />
                      </button>
                    {/each}
                  </div>
                </div>
              </Panel>
            {/if}

            <!-- Discussion -->
            <Panel>
              <DiscussionSection
                contentType="mod"
                contentId={mod.slug}
                {onnavigate}
              />
            </Panel>
          </div>

          <!-- Sidebar -->
          <aside class="sidebar">
            <Panel>
              <div class="download-section">
                {#if latestVersion}
                  <a
                    href={getDownloadUrl(mod.id, latestVersion.versionNumber || latestVersion.version || latestVersion.id)}
                    class="download-btn-large"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Latest
                  </a>
                  <span class="version-label">
                    Version {latestVersion.versionNumber || latestVersion.version}
                  </span>
                {:else}
                  <p class="no-downloads">No downloads available</p>
                {/if}

                <button
                  class="save-btn"
                  class:saved={isFavorited}
                  onclick={toggleFavorite}
                  disabled={favoriting}
                >
                  <svg viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  {favoriting ? 'Saving...' : isFavorited ? 'Saved' : 'Save'}
                </button>
              </div>
            </Panel>

            <Panel>
              <div class="stats-section">
                <h3 class="section-label">Statistics</h3>
                <div class="stat-row">
                  <span class="stat-label">Downloads</span>
                  <span class="stat-value">{formatDownloads(mod.downloads)}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Rating</span>
                  <span class="stat-value rating">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {formatRating(mod.rating)}
                  </span>
                </div>
                {#if mod.favoriteCount}
                  <div class="stat-row">
                    <span class="stat-label">Favorites</span>
                    <span class="stat-value">{mod.favoriteCount}</span>
                  </div>
                {/if}
                <div class="stat-row">
                  <span class="stat-label">Created</span>
                  <span class="stat-value">{formatDate(mod.createdAt)}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Updated</span>
                  <span class="stat-value">{formatDate(mod.updatedAt)}</span>
                </div>
              </div>
            </Panel>

            <Panel>
              <div class="links-section">
                <h3 class="section-label">Links</h3>

                <a href={getProjectUrl(mod)} target="_blank" rel="noopener noreferrer" class="link-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  View on Modtale
                </a>

                {#if mod.repositoryUrl}
                  <a href={mod.repositoryUrl} target="_blank" rel="noopener noreferrer" class="link-btn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Source Code
                  </a>
                {/if}

                {#if mod.links?.DISCORD}
                  <a href={mod.links.DISCORD} target="_blank" rel="noopener noreferrer" class="link-btn discord">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Discord
                  </a>
                {/if}

                {#if mod.links?.WEBSITE}
                  <a href={mod.links.WEBSITE} target="_blank" rel="noopener noreferrer" class="link-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Website
                  </a>
                {/if}
              </div>
            </Panel>

            {#if mod.license}
              <Panel>
                <div class="license-section">
                  <h3 class="section-label">License</h3>
                  <span class="license">{mod.license}</span>
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

<!-- Lightbox Modal -->
{#if lightboxImage}
  <div class="lightbox-overlay" onclick={closeLightbox}>
    <button class="lightbox-close" onclick={closeLightbox}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>

    {#if lightboxIndex > 0}
      <button class="lightbox-nav lightbox-prev" onclick={(e) => { e.stopPropagation(); prevImage(); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    {/if}

    <img
      src={lightboxImage}
      alt="Gallery image"
      class="lightbox-image"
      onclick={(e) => e.stopPropagation()}
    />

    {#if mod?.gallery && lightboxIndex < mod.gallery.length - 1}
      <button class="lightbox-nav lightbox-next" onclick={(e) => { e.stopPropagation(); nextImage(); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    {/if}

    <div class="lightbox-counter" onclick={(e) => e.stopPropagation()}>
      {lightboxIndex + 1} / {mod?.gallery?.length || 0}
    </div>
  </div>
{/if}

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

  /* Layout */
  .content-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
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

  /* Mod Header */
  .mod-header {
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

  .mod-icon,
  .mod-icon-placeholder {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .mod-icon {
    object-fit: cover;
    object-position: center;
    border: 1px solid #4a3f32;
  }

  .mod-icon-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    color: #6a5a4a;
  }

  .mod-icon-placeholder svg {
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

  .mod-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .type-badge {
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

  .mod-meta {
    margin-top: 0.5rem;
  }

  .author {
    font-size: 0.9rem;
    color: #8a7a6a;
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
  .versions-section,
  .gallery-section,
  .download-section,
  .stats-section,
  .links-section,
  .license-section {
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
    color: #c4b8a4;
    background: rgba(60, 50, 40, 0.5);
    border: 1px solid #4a3f32;
    border-radius: 3px;
  }

  /* Description */
  .description {
    font-size: 0.95rem;
    color: #c4b8a4;
    line-height: 1.6;
  }

  /* Markdown Content Styles */
  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3),
  .markdown-content :global(h4),
  .markdown-content :global(h5),
  .markdown-content :global(h6) {
    color: #f5d898;
    margin: 1.5rem 0 0.75rem 0;
    line-height: 1.3;
  }

  .markdown-content :global(h1) { font-size: 1.5rem; }
  .markdown-content :global(h2) { font-size: 1.3rem; }
  .markdown-content :global(h3) { font-size: 1.15rem; }
  .markdown-content :global(h4) { font-size: 1rem; }

  .markdown-content :global(h1:first-child),
  .markdown-content :global(h2:first-child),
  .markdown-content :global(h3:first-child) {
    margin-top: 0;
  }

  .markdown-content :global(p) {
    margin: 0.75rem 0;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }

  .markdown-content :global(li) {
    margin: 0.35rem 0;
  }

  .markdown-content :global(a) {
    color: #6bb8cc;
    text-decoration: none;
  }

  .markdown-content :global(a:hover) {
    text-decoration: underline;
  }

  .markdown-content :global(code) {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.85em;
    color: #e8c36b;
  }

  .markdown-content :global(pre) {
    background: rgba(0, 0, 0, 0.3);
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .markdown-content :global(pre code) {
    background: none;
    padding: 0;
    font-size: 0.85rem;
    color: #c4b8a4;
  }

  .markdown-content :global(blockquote) {
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    border-left: 3px solid #d4a44c;
    background: rgba(212, 164, 76, 0.1);
    color: #e8c36b;
  }

  .markdown-content :global(blockquote p) {
    margin: 0;
  }

  .markdown-content :global(hr) {
    border: none;
    border-top: 1px solid #3d3428;
    margin: 1.5rem 0;
  }

  .markdown-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    font-size: 0.85rem;
  }

  .markdown-content :global(th),
  .markdown-content :global(td) {
    padding: 0.5rem 0.75rem;
    border: 1px solid #3d3428;
    text-align: left;
  }

  .markdown-content :global(th) {
    background: rgba(0, 0, 0, 0.2);
    color: #f5d898;
    font-weight: 600;
  }

  .markdown-content :global(tr:nth-child(even)) {
    background: rgba(0, 0, 0, 0.1);
  }

  .markdown-content :global(strong) {
    color: #f0e6d8;
    font-weight: 600;
  }

  .markdown-content :global(em) {
    font-style: italic;
  }

  .markdown-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 0.5rem 0;
  }

  /* Versions */
  .versions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .version-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
  }

  .version-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .version-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    color: #6bb8cc;
    font-weight: 600;
  }

  .version-date {
    font-size: 0.8rem;
    color: #8a7a6a;
  }

  .game-versions {
    font-size: 0.75rem;
    color: #6a5a4a;
    padding: 0.2rem 0.4rem;
    background: rgba(60, 50, 40, 0.5);
    border-radius: 3px;
  }

  .version-download {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: linear-gradient(180deg, #3a5a3a 0%, #2d4a2d 100%);
    border: 1px solid #4a6a4a;
    border-radius: 4px;
    color: #8fbc8f;
    transition: all 0.15s;
  }

  .version-download:hover {
    background: linear-gradient(180deg, #4a6a4a 0%, #3a5a3a 100%);
    border-color: #5a8a5a;
    color: #b8e0b8;
  }

  .version-download svg {
    width: 16px;
    height: 16px;
  }

  /* Gallery */
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .gallery-item {
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  .gallery-image {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #3d3428;
    transition: border-color 0.15s, transform 0.15s;
  }

  .gallery-item:hover .gallery-image {
    border-color: #d4a44c;
    transform: scale(1.02);
  }

  /* Lightbox */
  .lightbox-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
    cursor: pointer;
  }

  .lightbox-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 44px;
    height: 44px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #4a3f32;
    border-radius: 50%;
    color: #c4b8a4;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .lightbox-close:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: #d4a44c;
    color: #f0e6d8;
  }

  .lightbox-close svg {
    width: 24px;
    height: 24px;
  }

  .lightbox-image {
    max-width: 90vw;
    max-height: 85vh;
    object-fit: contain;
    border-radius: 8px;
    cursor: default;
  }

  .lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #4a3f32;
    border-radius: 50%;
    color: #c4b8a4;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .lightbox-nav:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: #d4a44c;
    color: #f0e6d8;
  }

  .lightbox-nav svg {
    width: 28px;
    height: 28px;
  }

  .lightbox-prev {
    left: 1rem;
  }

  .lightbox-next {
    right: 1rem;
  }

  .lightbox-counter {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #4a3f32;
    border-radius: 20px;
    color: #c4b8a4;
    font-size: 0.85rem;
  }

  /* Download Section */
  .download-section {
    text-align: center;
  }

  .download-btn-large {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.85rem 1.5rem;
    background: linear-gradient(180deg, #3a5a3a 0%, #2d4a2d 100%);
    border: 1px solid #4a6a4a;
    border-radius: 6px;
    color: #b8e0b8;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s;
  }

  .download-btn-large:hover {
    background: linear-gradient(180deg, #4a6a4a 0%, #3a5a3a 100%);
    border-color: #5a8a5a;
    color: #d4f0d4;
  }

  .download-btn-large svg {
    width: 20px;
    height: 20px;
  }

  .version-label {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #6a5a4a;
  }

  .no-downloads {
    color: #6a5a4a;
    font-size: 0.9rem;
    margin: 0;
  }

  .save-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    margin-top: 0.75rem;
    padding: 0.6rem 1rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    color: #c4b8a4;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .save-btn:hover:not(:disabled) {
    border-color: #6b5a48;
    color: #f0e6d8;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .save-btn.saved {
    background: linear-gradient(180deg, #3a4a3a 0%, #2d3a2d 100%);
    border-color: #4a6a4a;
    color: #b8e0b8;
  }

  .save-btn.saved:hover:not(:disabled) {
    border-color: #5a8a5a;
    color: #d4f0d4;
  }

  .save-btn svg {
    width: 16px;
    height: 16px;
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

  .stat-value.rating {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-value.rating svg {
    width: 14px;
    height: 14px;
    color: #d4a44c;
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

  /* License */
  .license {
    font-size: 0.9rem;
    color: #c4b8a4;
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
</style>
