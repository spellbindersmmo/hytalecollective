<script>
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { fetchBuildBySlug, recordDownload, deleteBuild, updateBuild, updateBuildTags, fetchAllTags } from './stores/data.svelte.js'
  import { supabase, getStorageUrl } from './supabase.js'

  let { buildSlug = '', onnavigate = () => {} } = $props()

  // State
  let build = $state(null)
  let loading = $state(true)
  let error = $state(null)
  let downloading = $state(false)
  let showDeleteConfirm = $state(false)
  let deleting = $state(false)

  // Edit state
  let editing = $state(false)
  let editTitle = $state('')
  let editDescription = $state('')
  let editTags = $state([])
  let availableTags = $state([])
  let saving = $state(false)
  let saveError = $state(null)

  // Image edit state
  let editImageFile = $state(null)
  let editImagePreview = $state(null)
  let imageInput = $state(null)

  // Check if current user is the author or admin
  const isAuthor = $derived(
    auth.isAuthenticated && build?.author?.id === auth.user?.id
  )
  const canManage = $derived(isAuthor || auth.isAdmin)

  $effect(() => {
    if (buildSlug) {
      loadBuild()
    }
  })

  async function loadTags() {
    if (availableTags.length > 0) return // Already loaded
    try {
      availableTags = await fetchAllTags()
    } catch (e) {
      console.error('Error loading tags:', e)
    }
  }

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

  async function handleDelete() {
    if (!build || deleting) return

    deleting = true
    try {
      await deleteBuild(build.id, build.file_path, build.thumbnail_path)
      // Navigate back to builds page
      onnavigate('builds')
    } catch (e) {
      console.error('Error deleting build:', e)
      error = 'Failed to delete build'
      deleting = false
      showDeleteConfirm = false
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

  async function startEditing() {
    editTitle = build.title
    editDescription = build.description || ''
    // Initialize editTags with current tag IDs
    editTags = build.tags ? build.tags.map(t => t.id) : []
    editing = true
    saveError = null
    // Load tags for editing (only fetches once)
    await loadTags()
  }

  function cancelEditing() {
    editing = false
    editTitle = ''
    editDescription = ''
    editTags = []
    editImageFile = null
    editImagePreview = null
    saveError = null
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      saveError = 'Please select an image file'
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      saveError = 'Image must be less than 5MB'
      return
    }

    saveError = null
    editImageFile = file
    editImagePreview = URL.createObjectURL(file)
  }

  function removeEditImage() {
    editImageFile = null
    editImagePreview = null
    if (imageInput) imageInput.value = ''
  }

  function toggleTag(tag) {
    if (editTags.includes(tag.id)) {
      editTags = editTags.filter(id => id !== tag.id)
    } else if (editTags.length < 5) {
      editTags = [...editTags, tag.id]
    }
  }

  async function saveEdit() {
    if (!editTitle.trim()) return

    saving = true
    saveError = null

    try {
      let newThumbnailPath = null

      // Upload new image if selected
      if (editImageFile) {
        const fileExt = editImageFile.name.split('.').pop()
        const fileName = `${build.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('thumbnails')
          .upload(fileName, editImageFile, { upsert: true })

        if (uploadError) throw uploadError
        newThumbnailPath = fileName

        // Delete old thumbnail if it exists
        if (build.thumbnail_path) {
          await supabase.storage
            .from('thumbnails')
            .remove([build.thumbnail_path])
        }
      }

      // Update build
      const updates = {
        title: editTitle.trim(),
        description: editDescription.trim()
      }
      if (newThumbnailPath) {
        updates.thumbnail_path = newThumbnailPath
      }

      await updateBuild(build.id, updates)

      // Update tags
      await updateBuildTags(build.id, editTags)

      // Update local state
      build.title = editTitle.trim()
      build.description = editDescription.trim()
      if (newThumbnailPath) {
        build.thumbnail_path = newThumbnailPath
        build.thumbnail = getStorageUrl('thumbnails', newThumbnailPath)
      }
      // Update tags in local state - map tag IDs to full tag objects
      build.tags = editTags.map(tagId => {
        const tag = availableTags.find(t => t.id === tagId)
        return tag || { id: tagId, name: 'Unknown', color: '#c4b8a4' }
      })

      editing = false
      editImageFile = null
      editImagePreview = null
    } catch (e) {
      console.error('Error updating build:', e)
      saveError = 'Failed to save changes'
    } finally {
      saving = false
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
              <div class="build-preview" class:editing>
                {#if editing}
                  {#if editImagePreview}
                    <img src={editImagePreview} alt="New thumbnail preview" class="preview-image" />
                    <button class="remove-image-btn" onclick={removeEditImage} type="button">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  {:else if build.thumbnail}
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
                  <input
                    type="file"
                    accept="image/*"
                    bind:this={imageInput}
                    onchange={handleImageSelect}
                    class="hidden-input"
                  />
                  <button class="change-image-btn" onclick={() => imageInput?.click()} type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Change Image
                  </button>
                {:else}
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
                {/if}
              </div>
            </Panel>

            <Panel>
              <div class="build-header">
                {#if editing}
                  <input
                    type="text"
                    class="edit-title-input"
                    bind:value={editTitle}
                    placeholder="Build title"
                  />
                {:else}
                  <h1 class="build-title">{build.title}</h1>
                {/if}
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

            {#if editing || (build.tags && build.tags.length > 0)}
              <Panel>
                <div class="tags-section">
                  <h3 class="section-label">
                    Tags
                    {#if editing}
                      <small class="tag-count">({editTags.length}/5)</small>
                    {/if}
                  </h3>
                  {#if editing}
                    <div class="tags-grid">
                      {#each availableTags as tag}
                        <button
                          type="button"
                          class="tag-btn"
                          class:selected={editTags.includes(tag.id)}
                          style="--tag-color: {tag.color}"
                          onclick={() => toggleTag(tag)}
                          disabled={saving || (!editTags.includes(tag.id) && editTags.length >= 5)}
                        >
                          {tag.name}
                        </button>
                      {/each}
                    </div>
                  {:else}
                    <div class="tags-list">
                      {#each build.tags as tag}
                        <span class="tag" style="--tag-color: {tag.color || '#c4b8a4'}">{tag.name}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              </Panel>
            {/if}

            <Panel>
              <div class="description-section">
                <h3 class="section-label">Description</h3>
                {#if editing}
                  <textarea
                    class="edit-description-input"
                    bind:value={editDescription}
                    placeholder="Build description..."
                    rows="6"
                  ></textarea>
                {:else}
                  <div class="description">
                    {build.description || 'No description provided.'}
                  </div>
                {/if}
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

            {#if canManage}
              <Panel>
                <div class="manage-section">
                  <h3 class="section-label">Manage</h3>
                  {#if editing}
                    <div class="edit-actions">
                      {#if saveError}
                        <p class="save-error">{saveError}</p>
                      {/if}
                      <button class="save-btn" onclick={saveEdit} disabled={saving || !editTitle.trim()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button class="cancel-edit-btn" onclick={cancelEditing} disabled={saving}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Cancel
                      </button>
                    </div>
                  {:else}
                    <button class="edit-btn" onclick={startEditing}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Build
                    </button>
                    <button class="delete-btn" onclick={() => showDeleteConfirm = true}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                      Delete Build
                    </button>
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

{#if showDeleteConfirm}
  <div class="modal-overlay" onclick={() => showDeleteConfirm = false}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h3 class="modal-title">Delete Build</h3>
      <p class="modal-text">
        Are you sure you want to delete "{build?.title}"? This action cannot be undone.
      </p>
      <div class="modal-actions">
        <button class="cancel-btn" onclick={() => showDeleteConfirm = false} disabled={deleting}>
          Cancel
        </button>
        <button class="confirm-delete-btn" onclick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
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

  /* Preview */
  .build-preview {
    position: relative;
    padding: 0;
    overflow: hidden;
    border-radius: 4px;
  }

  .build-preview.editing {
    border: 2px dashed #4a3f32;
  }

  .preview-image {
    width: 100%;
    max-height: 500px;
    object-fit: contain;
    display: block;
    background: #1a1612;
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

  .hidden-input {
    display: none;
  }

  .change-image-btn {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: rgba(0, 0, 0, 0.75);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    color: #f0e6d8;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .change-image-btn:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: #6b5a48;
  }

  .change-image-btn svg {
    width: 18px;
    height: 18px;
  }

  .remove-image-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(180, 60, 60, 0.9);
    border: none;
    border-radius: 50%;
    color: #fff;
    cursor: pointer;
    transition: all 0.15s;
  }

  .remove-image-btn:hover {
    background: rgba(200, 70, 70, 1);
  }

  .remove-image-btn svg {
    width: 18px;
    height: 18px;
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

  .tag-count {
    font-size: 0.7rem;
    font-weight: 400;
    color: #6a5a4a;
    margin-left: 0.5rem;
  }

  .tags-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: #a89880;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid #3d3428;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tag-btn:hover:not(:disabled) {
    background: rgba(60, 50, 40, 0.4);
    border-color: var(--tag-color, #4a3f32);
  }

  .tag-btn.selected {
    background: rgba(212, 164, 76, 0.15);
    border-color: var(--tag-color, #d4a44c);
    color: #f5d898;
  }

  .tag-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  /* Edit Inputs */
  .edit-title-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    outline: none;
    box-sizing: border-box;
  }

  .edit-title-input:focus {
    border-color: #6bb8cc;
  }

  .edit-description-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.95rem;
    color: #c4b8a4;
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    outline: none;
    resize: vertical;
    min-height: 120px;
    font-family: inherit;
    line-height: 1.6;
    box-sizing: border-box;
  }

  .edit-description-input:focus {
    border-color: #6bb8cc;
  }

  /* Manage Section */
  .manage-section {
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .manage-section .section-label {
    margin-bottom: 0.25rem;
  }

  .edit-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .save-error {
    margin: 0 0 0.5rem 0;
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    color: #e8b8b8;
    background: rgba(180, 60, 60, 0.2);
    border: 1px solid rgba(180, 60, 60, 0.4);
    border-radius: 4px;
  }

  .edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, #3a4a5a 0%, #2a3a4a 100%);
    border: 1px solid #4a5a6a;
    border-radius: 6px;
    color: #b8d0e8;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .edit-btn:hover {
    background: linear-gradient(180deg, #4a5a6a 0%, #3a4a5a 100%);
    border-color: #5a7a8a;
    color: #d0e8f0;
  }

  .edit-btn svg {
    width: 18px;
    height: 18px;
  }

  .save-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, #3a5a3a 0%, #2d4a2d 100%);
    border: 1px solid #4a6a4a;
    border-radius: 6px;
    color: #b8e0b8;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .save-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #4a6a4a 0%, #3a5a3a 100%);
    border-color: #5a8a5a;
    color: #d4f0d4;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .save-btn svg {
    width: 18px;
    height: 18px;
  }

  .cancel-edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, #4d4235 0%, #3a3127 100%);
    border: 1px solid #6b5a48;
    border-radius: 6px;
    color: #f0e6d8;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .cancel-edit-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #5a4d3e 0%, #453a2e 100%);
    border-color: #9c8465;
  }

  .cancel-edit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-edit-btn svg {
    width: 18px;
    height: 18px;
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, #5a3030 0%, #4a2525 100%);
    border: 1px solid #6a4040;
    border-radius: 6px;
    color: #e8b8b8;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .delete-btn:hover {
    background: linear-gradient(180deg, #6a3a3a 0%, #5a3030 100%);
    border-color: #8a5050;
    color: #f0d0d0;
  }

  .delete-btn svg {
    width: 18px;
    height: 18px;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .modal-title {
    font-size: 1.25rem;
    color: #f5d898;
    margin: 0 0 1rem 0;
  }

  .modal-text {
    font-size: 0.95rem;
    color: #c4b8a4;
    line-height: 1.5;
    margin: 0 0 1.5rem 0;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .cancel-btn {
    padding: 0.6rem 1.25rem;
    background: linear-gradient(180deg, #4d4235 0%, #3a3127 100%);
    border: 1px solid #6b5a48;
    border-radius: 6px;
    color: #f0e6d8;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .cancel-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #5a4d3e 0%, #453a2e 100%);
    border-color: #9c8465;
  }

  .cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .confirm-delete-btn {
    padding: 0.6rem 1.25rem;
    background: linear-gradient(180deg, #8a3535 0%, #6a2525 100%);
    border: 1px solid #a04545;
    border-radius: 6px;
    color: #fff;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .confirm-delete-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #a04545 0%, #8a3535 100%);
    border-color: #c05555;
  }

  .confirm-delete-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
