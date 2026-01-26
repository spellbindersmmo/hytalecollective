<script>
  import { marked } from 'marked'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import DiscussionSection from './DiscussionSection.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { addFavorite, removeFavorite, checkFavorite, fetchLocalModBySlug, incrementModDownload, rateLocalMod, getUserModRating } from './stores/data.svelte.js'
  import {
    getProject,
    formatDownloads,
    formatRating,
    getProjectUrl,
    getDownloadUrl,
    getLatestVersion,
    classificationOptions
  } from './modtale.js'

  // Check if this is a local mod
  const isLocalMod = $derived(modSlug?.startsWith('local-'))

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

  // Rating state
  let userRating = $state(null)
  let hoverRating = $state(null)
  let submittingRating = $state(false)

  
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
      if (modSlug.startsWith('local-')) {
        // Fetch local mod from Supabase
        mod = await fetchLocalModBySlug(modSlug)
        // Fetch user's rating for this mod
        if (auth.isAuthenticated && mod) {
          userRating = await getUserModRating(mod.id)
        }
      } else {
        // Fetch from Modtale
        mod = await getProject(modSlug)
      }
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

  async function submitRating(rating) {
    if (!auth.isAuthenticated) {
      auth.openModal()
      return
    }
    if (submittingRating || !mod?.id) return

    submittingRating = true
    try {
      await rateLocalMod(mod.id, rating)
      userRating = rating
      // Refresh mod to get updated rating average
      mod = await fetchLocalModBySlug(modSlug)
    } catch (e) {
      console.error('Error submitting rating:', e)
      alert('Failed to submit rating')
    } finally {
      submittingRating = false
    }
  }

  // Check if current user is the owner of a local mod
  const isOwner = $derived(
    isLocalMod && auth.isAuthenticated && mod?.authorId === auth.user?.id
  )

  function handleLocalDownload(version) {
    if (mod?.id) {
      incrementModDownload(mod.id)
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
                      {#if isLocalMod}
                        <div class="source-badge">Community</div>
                      {/if}
                    </div>

                    <div class="mod-meta">
                      <span class="author">by {mod.author}</span>
                    </div>
                  </div>
                </div>

                {#if isOwner}
                  <div class="owner-actions">
                    <button
                      class="manage-toggle-btn"
                      onclick={() => onnavigate(`mod-edit-${mod.slug}`)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Manage Mod
                    </button>
                  </div>
                {/if}
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

            {#if mod.dependencies && mod.dependencies.length > 0}
              <Panel>
                <div class="dependencies-section">
                  <h3 class="section-label">Dependencies</h3>
                  <div class="dependencies-list">
                    {#each mod.dependencies as dep}
                      <button
                        class="dependency-item"
                        onclick={() => onnavigate(`mod-${dep.slug}`)}
                      >
                        <div class="dep-icon">
                          {#if dep.iconUrl}
                            <img src={dep.iconUrl} alt={dep.title} />
                          {:else}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                          {/if}
                        </div>
                        <div class="dep-info">
                          <span class="dep-title">{dep.title}</span>
                          <span class="dep-type dep-type-{dep.type}">{dep.type}</span>
                        </div>
                        {#if dep.isLocal}
                          <span class="dep-source">Community</span>
                        {:else}
                          <span class="dep-source">Modtale</span>
                        {/if}
                      </button>
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
                          href={isLocalMod ? version.downloadUrl : getDownloadUrl(mod.id, version.versionNumber || version.version || version.id)}
                          class="version-download"
                          onclick={() => isLocalMod && handleLocalDownload(version)}
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

            {#if mod.changelog || (mod.versions && mod.versions.some(v => v.changelog))}
              <Panel>
                <div class="changelog-section">
                  <h3 class="section-label">Changelog</h3>
                  <div class="changelog-content">
                    {#if mod.changelog}
                      <div class="changelog-overview markdown-content">
                        {@html marked.parse(mod.changelog)}
                      </div>
                    {/if}

                    {#each mod.versions.filter(v => v.changelog) as version}
                      <div class="changelog-version">
                        <div class="changelog-version-header">
                          <span class="changelog-version-number">{version.versionNumber || version.version}</span>
                          <span class="changelog-version-date">{formatDate(version.createdAt || version.uploadedAt)}</span>
                        </div>
                        <div class="changelog-version-content markdown-content">
                          {@html marked.parse(version.changelog)}
                        </div>
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
                    href={isLocalMod ? latestVersion.downloadUrl : getDownloadUrl(mod.id, latestVersion.versionNumber || latestVersion.version || latestVersion.id)}
                    class="download-btn-large"
                    onclick={() => isLocalMod && handleLocalDownload(latestVersion)}
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
                {#if isLocalMod}
                  <div class="stat-row rating-row">
                    <span class="stat-label">Rating</span>
                    <div class="interactive-rating">
                      <div
                        class="star-rating"
                        onmouseleave={() => hoverRating = null}
                      >
                        {#each [1, 2, 3, 4, 5] as star}
                          <button
                            class="star-btn"
                            class:filled={(hoverRating || userRating || 0) >= star}
                            class:user-rated={userRating >= star && !hoverRating}
                            onmouseenter={() => hoverRating = star}
                            onclick={() => submitRating(star)}
                            disabled={submittingRating}
                            title={userRating === star ? 'Your rating' : `Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            <svg viewBox="0 0 24 24">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        {/each}
                      </div>
                      <span class="rating-info">
                        {#if mod.rating && mod.rating > 0}
                          {mod.rating.toFixed(1)}
                          {#if mod.ratingCount}
                            <span class="rating-count">({mod.ratingCount})</span>
                          {/if}
                        {:else}
                          <span class="no-ratings">No ratings</span>
                        {/if}
                      </span>
                    </div>
                  </div>
                {:else}
                  <div class="stat-row">
                    <span class="stat-label">Rating</span>
                    <span class="stat-value rating">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      {formatRating(mod.rating)}
                    </span>
                  </div>
                {/if}
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

                {#if !isLocalMod}
                  <a href={getProjectUrl(mod)} target="_blank" rel="noopener noreferrer" class="link-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    View on Modtale
                  </a>
                {/if}

                {#if mod.repositoryUrl}
                  <a href={mod.repositoryUrl} target="_blank" rel="noopener noreferrer" class="link-btn source-link">
                    {#if mod.sourceType === 'github'}
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      View on GitHub
                    {:else if mod.sourceType === 'gitlab'}
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
                      </svg>
                      View on GitLab
                    {:else if mod.sourceType === 'bitbucket'}
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.778 1.213a.768.768 0 0 0-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 0 0 .77-.646l3.27-20.03a.768.768 0 0 0-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z"/>
                      </svg>
                      View on Bitbucket
                    {:else}
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      Source Code
                    {/if}
                  </a>
                {/if}

                {#if mod.discordUrl || mod.links?.DISCORD}
                  <a href={mod.discordUrl || mod.links.DISCORD} target="_blank" rel="noopener noreferrer" class="link-btn discord">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Discord
                  </a>
                {/if}

                {#if mod.websiteUrl || mod.links?.WEBSITE}
                  <a href={mod.websiteUrl || mod.links.WEBSITE} target="_blank" rel="noopener noreferrer" class="link-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Website
                  </a>
                {/if}

                {#if isLocalMod && !mod.repositoryUrl && !mod.discordUrl && !mod.websiteUrl}
                  <p class="no-links">No external links configured</p>
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

  .source-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #7ec47b;
    background: rgba(126, 196, 123, 0.15);
    border: 1px solid rgba(126, 196, 123, 0.4);
    border-radius: 3px;
  }

  .owner-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }

  .manage-toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #c4b8a4;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .manage-toggle-btn:hover {
    border-color: #6b5a48;
    color: #f0e6d8;
  }

  .manage-toggle-btn.active {
    background: linear-gradient(180deg, #3a4a3a 0%, #2d3a2d 100%);
    border-color: #4a6a4a;
    color: #b8e0b8;
  }

  .manage-toggle-btn svg {
    width: 16px;
    height: 16px;
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

  /* Interactive Rating */
  .rating-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .interactive-rating {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .star-rating {
    display: flex;
    gap: 0.15rem;
  }

  .star-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: transform 0.1s;
  }

  .star-btn:hover {
    transform: scale(1.15);
  }

  .star-btn:disabled {
    cursor: wait;
  }

  .star-btn svg {
    width: 20px;
    height: 20px;
    fill: #3d3428;
    stroke: #5a4a3a;
    stroke-width: 1;
    transition: all 0.15s;
  }

  .star-btn.filled svg {
    fill: #d4a44c;
    stroke: #b8893a;
  }

  .star-btn.user-rated svg {
    fill: #f0d090;
    stroke: #d4a44c;
    filter: drop-shadow(0 0 4px rgba(212, 164, 76, 0.4));
  }

  .rating-info {
    font-size: 0.9rem;
    color: #c4b8a4;
    font-weight: 500;
  }

  .rating-count {
    color: #8a7a6a;
    font-weight: 400;
    font-size: 0.85rem;
  }

  .no-ratings {
    color: #6a5a4a;
    font-style: italic;
    font-size: 0.85rem;
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

  .no-links {
    font-size: 0.85rem;
    color: #6a5a4a;
    margin: 0;
    font-style: italic;
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

  /* Management Panel Styles */
  .manage-section {
    padding: 0.5rem;
  }

  .manage-field {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #3d3428;
  }

  .manage-field:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .field-label {
    display: block;
    font-size: 0.75rem;
    color: #8a7a6a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .field-value-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .field-value {
    font-size: 0.85rem;
    color: #c4b8a4;
    flex: 1;
    min-width: 0;
  }

  .field-value.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .edit-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #6a5a4a;
    cursor: pointer;
    transition: all 0.15s;
  }

  .edit-btn:hover {
    border-color: #6bb8cc;
    color: #6bb8cc;
  }

  .edit-btn svg {
    width: 14px;
    height: 14px;
  }

  .edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .edit-input,
  .edit-textarea,
  .edit-select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #f0e6d8;
    font-size: 0.85rem;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  .edit-input:focus,
  .edit-textarea:focus,
  .edit-select:focus {
    outline: none;
    border-color: #6bb8cc;
  }

  .edit-textarea {
    resize: vertical;
    min-height: 60px;
  }

  .edit-textarea.tall {
    min-height: 120px;
  }

  .edit-select {
    cursor: pointer;
  }

  .edit-actions {
    display: flex;
    gap: 0.5rem;
  }

  .save-edit-btn,
  .cancel-edit-btn {
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .save-edit-btn {
    background: linear-gradient(180deg, #3a5a3a 0%, #2d4a2d 100%);
    border: 1px solid #4a6a4a;
    color: #b8e0b8;
  }

  .save-edit-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #4a6a4a 0%, #3a5a3a 100%);
    border-color: #5a8a5a;
  }

  .save-edit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cancel-edit-btn {
    background: transparent;
    border: 1px solid #3d3428;
    color: #8a7a6a;
  }

  .cancel-edit-btn:hover {
    border-color: #6b5a48;
    color: #c4b8a4;
  }

  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 3px;
  }

  .status-draft {
    background: rgba(138, 122, 106, 0.2);
    border: 1px solid rgba(138, 122, 106, 0.4);
    color: #8a7a6a;
  }

  .status-published {
    background: rgba(126, 196, 123, 0.15);
    border: 1px solid rgba(126, 196, 123, 0.4);
    color: #7ec47b;
  }

  .status-archived {
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.4);
    color: #c46b6b;
  }

  /* Icon Upload */
  .icon-upload-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .current-icon {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    object-fit: cover;
    border: 1px solid #4a3f32;
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #c4b8a4;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .upload-btn:hover {
    border-color: #6b5a48;
    color: #f0e6d8;
  }

  /* Version Form */
  .version-form {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .form-group {
    margin-bottom: 0.75rem;
  }

  .form-group:last-of-type {
    margin-bottom: 0;
  }

  .file-input {
    width: 100%;
    padding: 0.5rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #c4b8a4;
    font-size: 0.8rem;
  }

  .file-input::file-selector-button {
    padding: 0.3rem 0.6rem;
    margin-right: 0.5rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 3px;
    color: #c4b8a4;
    cursor: pointer;
  }

  .file-name {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.75rem;
    color: #6a5a4a;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .upload-progress {
    height: 4px;
    background: #3d3428;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #6bb8cc, #7ec47b);
    transition: width 0.3s ease;
  }

  /* Add Version Button */
  .add-version-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.65rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px dashed #4a3f32;
    border-radius: 6px;
    color: #8a7a6a;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 1rem;
  }

  .add-version-btn:hover {
    border-color: #6bb8cc;
    color: #6bb8cc;
  }

  .add-version-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Manage Versions List */
  .manage-versions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .manage-version-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
  }

  .version-info-small {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .version-size {
    font-size: 0.75rem;
    color: #6a5a4a;
  }

  .delete-version-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #6a5a4a;
    cursor: pointer;
    transition: all 0.15s;
  }

  .delete-version-btn:hover {
    border-color: rgba(196, 107, 107, 0.4);
    color: #c46b6b;
  }

  .delete-version-btn svg {
    width: 14px;
    height: 14px;
  }

  /* Gallery Management */
  .gallery-upload {
    width: 100%;
    justify-content: center;
    margin-bottom: 1rem;
    border: 1px dashed #4a3f32;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
  }

  .gallery-upload:hover {
    border-color: #6bb8cc;
    color: #6bb8cc;
  }

  .gallery-upload svg {
    width: 18px;
    height: 18px;
  }

  .manage-gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .manage-gallery-item {
    position: relative;
    aspect-ratio: 16/9;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #3d3428;
  }

  .manage-gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .delete-gallery-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    padding: 0;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(196, 107, 107, 0.4);
    border-radius: 50%;
    color: #c46b6b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .manage-gallery-item:hover .delete-gallery-btn {
    opacity: 1;
  }

  .delete-gallery-btn:hover {
    background: rgba(196, 107, 107, 0.3);
    border-color: #c46b6b;
  }

  .delete-gallery-btn svg {
    width: 12px;
    height: 12px;
  }

  /* Danger Zone */
  .danger-zone {
    border: 1px solid rgba(196, 107, 107, 0.3);
    border-radius: 6px;
    padding: 1rem;
    margin: -0.5rem;
  }

  .section-label.danger {
    color: #c46b6b;
  }

  .danger-warning {
    font-size: 0.8rem;
    color: #8a7a6a;
    margin: 0 0 1rem 0;
  }

  .delete-mod-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.65rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.4);
    border-radius: 4px;
    color: #c46b6b;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .delete-mod-btn:hover {
    background: rgba(196, 107, 107, 0.25);
    border-color: #c46b6b;
  }

  .delete-mod-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Dependencies Section */
  .dependencies-section {
    padding: 0.5rem;
  }

  .dependencies-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .dependency-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    width: 100%;
    font-family: inherit;
    transition: all 0.15s;
  }

  .dependency-item:hover {
    border-color: #6b5a48;
    background: linear-gradient(180deg, #302820 0%, #282218 100%);
  }

  .dep-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 6px;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .dep-icon.small {
    width: 28px;
    height: 28px;
    border-radius: 4px;
  }

  .dep-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .dep-icon svg {
    width: 18px;
    height: 18px;
    color: #6a5a4a;
  }

  .dep-icon.small svg {
    width: 14px;
    height: 14px;
  }

  .dep-info {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dep-title {
    font-size: 0.9rem;
    color: #f0e6d8;
    font-weight: 500;
  }

  .dep-type {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .dep-type-required {
    background: rgba(107, 184, 204, 0.15);
    border: 1px solid rgba(107, 184, 204, 0.4);
    color: #6bb8cc;
  }

  .dep-type-optional {
    background: rgba(212, 164, 76, 0.15);
    border: 1px solid rgba(212, 164, 76, 0.4);
    color: #d4a44c;
  }

  .dep-type-incompatible {
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.4);
    color: #c46b6b;
  }

  .dep-source {
    font-size: 0.7rem;
    color: #6a5a4a;
    flex-shrink: 0;
  }

  /* Changelog Section */
  .changelog-section {
    padding: 0.5rem;
  }

  .changelog-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .changelog-overview {
    padding-bottom: 1rem;
    border-bottom: 1px solid #3d3428;
  }

  .changelog-version {
    padding: 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
  }

  .changelog-version-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .changelog-version-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    color: #6bb8cc;
    font-weight: 600;
  }

  .changelog-version-date {
    font-size: 0.8rem;
    color: #6a5a4a;
  }

  .changelog-version-content {
    font-size: 0.85rem;
    color: #c4b8a4;
  }

  .changelog-version-content :global(p) {
    margin: 0.35rem 0;
  }

  .changelog-version-content :global(ul),
  .changelog-version-content :global(ol) {
    margin: 0.35rem 0;
    padding-left: 1.25rem;
  }

  /* Dependency Management */
  .dependency-form {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .dependency-search-results {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 0.75rem;
  }

  .dependency-search-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    text-align: left;
    font-family: inherit;
    transition: all 0.15s;
  }

  .dependency-search-item:hover:not(:disabled) {
    border-color: #6bb8cc;
  }

  .dependency-search-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dep-result-title {
    flex: 1;
    font-size: 0.85rem;
    color: #f0e6d8;
  }

  .dep-result-source {
    font-size: 0.7rem;
    color: #6a5a4a;
  }

  .searching-text,
  .no-results-text,
  .no-items-text {
    font-size: 0.8rem;
    color: #6a5a4a;
    font-style: italic;
    margin: 0.5rem 0;
  }

  .manage-dependencies-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .manage-dependency-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
  }

  .dep-manage-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .dep-manage-info .dep-title {
    font-size: 0.85rem;
  }

  /* Source Type Badge */
  .source-type-badge {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .source-icon {
    width: 14px;
    height: 14px;
  }

  .source-link svg {
    flex-shrink: 0;
  }
</style>
