<script>
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { fetchBuildBySlug, recordDownload } from './stores/data.svelte.js'

  let { buildSlug = '', onnavigate = () => {} } = $props()

  // State
  let build = $state(null)
  let loading = $state(true)
  let error = $state(null)
  let downloading = $state(false)

  $effect(() => {
    if (buildSlug) {
      loadBuild()
    }
  })

  async function loadBuild() {
    loading = true
    error = null

    try {
      build = await fetchBuildBySlug(buildSlug)
    } catch (e) {
      console.error('Error loading build:', e)
      error = 'Build not found'
    } finally {
      loading = false
    }
  }

  async function handleDownload() {
    if (!build?.file_url || downloading) return

    downloading = true
    try {
      // Record the download
      await recordDownload('build', build.id)

      // Trigger download
      const link = document.createElement('a')
      link.href = build.file_url
      link.download = build.file_name || `${build.title}.schematic`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Error downloading:', e)
    } finally {
      downloading = false
    }
  }

  function formatNumber(num) {
    if (!num) return '0'
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
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
</script>

<div class="page">
  <Navbar currentPage="builds" {onnavigate} />

  <main class="main">
    <div class="container">
      <button class="back-link" onclick={() => onnavigate('builds')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Builds
      </button>

      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading build...</p>
        </div>
      {:else if error}
        <Panel>
          <div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3>Build Not Found</h3>
            <p>The build you're looking for doesn't exist or has been removed.</p>
            <Button variant="primary" onclick={() => onnavigate('builds')}>
              Browse Builds
            </Button>
          </div>
        </Panel>
      {:else if build}
        <div class="content-layout">
          <!-- Main Content -->
          <div class="main-content">
            <!-- Thumbnail -->
            <Panel>
              <div class="build-preview">
                {#if build.thumbnail}
                  <img src={build.thumbnail} alt={build.title} class="preview-image" />
                {:else}
                  <div class="preview-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                {/if}
              </div>
            </Panel>

            <Panel>
              <div class="build-header">
                <h1 class="build-title">{build.title}</h1>
                {#if build.author}
                  <button
                    class="author-link"
                    onclick={() => onnavigate(`profile-${build.author.username}`)}
                  >
                    {#if build.author.avatar_url}
                      <img src={build.author.avatar_url} alt={build.author.username} class="author-avatar" />
                    {:else}
                      <div class="author-avatar-placeholder">
                        {build.author.username.charAt(0).toUpperCase()}
                      </div>
                    {/if}
                    <span>by {build.author.username}</span>
                  </button>
                {/if}
              </div>
            </Panel>

            {#if build.tags && build.tags.length > 0}
              <Panel>
                <div class="tags-section">
                  <h3 class="section-label">Tags</h3>
                  <div class="tags-list">
                    {#each build.tags as tag}
                      <span class="tag" style="--tag-color: {tag.color || '#c4b8a4'}">{tag.name}</span>
                    {/each}
                  </div>
                </div>
              </Panel>
            {/if}

            <Panel>
              <div class="description-section">
                <h3 class="section-label">Description</h3>
                <div class="description">
                  {build.description || 'No description provided.'}
                </div>
              </div>
            </Panel>

            {#if build.screenshots && build.screenshots.length > 0}
              <Panel>
                <div class="gallery-section">
                  <h3 class="section-label">Screenshots</h3>
                  <div class="gallery-grid">
                    {#each build.screenshots as screenshot}
                      <img src={screenshot} alt="Screenshot" class="gallery-image" />
                    {/each}
                  </div>
                </div>
              </Panel>
            {/if}
          </div>

          <!-- Sidebar -->
          <aside class="sidebar">
            <Panel>
              <div class="download-section">
                {#if build.file_url}
                  <button
                    class="download-btn-large"
                    onclick={handleDownload}
                    disabled={downloading}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {downloading ? 'Downloading...' : 'Download Build'}
                  </button>
                  {#if build.file_size}
                    <span class="file-size">{formatFileSize(build.file_size)}</span>
                  {/if}
                {:else}
                  <p class="no-download">Download not available</p>
                {/if}
              </div>
            </Panel>

            <Panel>
              <div class="stats-section">
                <h3 class="section-label">Statistics</h3>
                <div class="stat-row">
                  <span class="stat-label">Downloads</span>
                  <span class="stat-value">{formatNumber(build.download_count)}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Views</span>
                  <span class="stat-value">{formatNumber(build.view_count)}</span>
                </div>
                {#if build.block_count}
                  <div class="stat-row">
                    <span class="stat-label">Blocks</span>
                    <span class="stat-value">{formatNumber(build.block_count)}</span>
                  </div>
                {/if}
                {#if build.dimensions}
                  <div class="stat-row">
                    <span class="stat-label">Dimensions</span>
                    <span class="stat-value">{build.dimensions}</span>
                  </div>
                {/if}
                <div class="stat-row">
                  <span class="stat-label">Uploaded</span>
                  <span class="stat-value">{formatDate(build.created_at)}</span>
                </div>
                {#if build.updated_at && build.updated_at !== build.created_at}
                  <div class="stat-row">
                    <span class="stat-label">Updated</span>
                    <span class="stat-value">{formatDate(build.updated_at)}</span>
                  </div>
                {/if}
              </div>
            </Panel>

            {#if build.author}
              <Panel>
                <div class="author-section">
                  <h3 class="section-label">Creator</h3>
                  <button
                    class="author-card"
                    onclick={() => onnavigate(`profile-${build.author.username}`)}
                  >
                    {#if build.author.avatar_url}
                      <img src={build.author.avatar_url} alt={build.author.username} class="author-avatar-large" />
                    {:else}
                      <div class="author-avatar-large-placeholder">
                        {build.author.username.charAt(0).toUpperCase()}
                      </div>
                    {/if}
                    <div class="author-info">
                      <span class="author-name">{build.author.username}</span>
                      {#if build.author.bio}
                        <span class="author-bio">{build.author.bio}</span>
                      {/if}
                    </div>
                  </button>
                </div>
              </Panel>
            {/if}
          </aside>
        </div>
      {/if}
    </div>
  </main>

  <Footer />
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

  /* Preview */
  .build-preview {
    padding: 0;
    overflow: hidden;
    border-radius: 4px;
  }

  .preview-image {
    width: 100%;
    max-height: 400px;
    object-fit: cover;
    display: block;
  }

  .preview-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 250px;
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    color: #6a5a4a;
  }

  .preview-placeholder svg {
    width: 64px;
    height: 64px;
  }

  /* Header */
  .build-header {
    padding: 0.5rem;
  }

  .build-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 0.75rem 0;
  }

  .author-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    background: none;
    border: none;
    color: #c4b8a4;
    font-size: 0.9rem;
    cursor: pointer;
    transition: color 0.15s;
  }

  .author-link:hover {
    color: #f0e6d8;
  }

  .author-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }

  .author-avatar-placeholder {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(180deg, #4a3f32 0%, #3a3127 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8rem;
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
  .gallery-section,
  .download-section,
  .stats-section,
  .author-section {
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

  /* Gallery */
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .gallery-image {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #3d3428;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .gallery-image:hover {
    border-color: #6b5a48;
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
    cursor: pointer;
    transition: all 0.15s;
  }

  .download-btn-large:hover:not(:disabled) {
    background: linear-gradient(180deg, #4a6a4a 0%, #3a5a3a 100%);
    border-color: #5a8a5a;
    color: #d4f0d4;
  }

  .download-btn-large:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .download-btn-large svg {
    width: 20px;
    height: 20px;
  }

  .file-size {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #6a5a4a;
  }

  .no-download {
    color: #6a5a4a;
    font-size: 0.9rem;
    margin: 0;
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

  /* Author Card */
  .author-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.5rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }

  .author-card:hover {
    border-color: #4a3f32;
  }

  .author-avatar-large {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .author-avatar-large-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(180deg, #4a3f32 0%, #3a3127 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c4b8a4;
    font-weight: 600;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .author-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .author-name {
    font-size: 0.95rem;
    color: #f0e6d8;
    font-weight: 500;
  }

  .author-bio {
    font-size: 0.8rem;
    color: #8a7a6a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
