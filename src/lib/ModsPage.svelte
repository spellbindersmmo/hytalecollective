<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import {
    searchProjects,
    getTags,
    formatDownloads,
    formatRating,
    getLatestDownloadUrl,
    sortOptions,
    classificationOptions
  } from './modtale.js'

  let { onnavigate = () => {} } = $props()

  // State
  let mods = $state([])
  let tags = $state([])
  let loading = $state(true)
  let error = $state(null)
  let totalCount = $state(0)
  let totalPages = $state(0)

  // Filters
  let search = $state('')
  let classificationFilter = $state('')
  let sortBy = $state('downloads')
  let currentPage = $state(0)
  const pageSize = 20

  // Debounced search
  let searchTimeout = null

  // Timeout wrapper
  function withTimeout(promise, ms = 10000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms))
    ])
  }

  async function loadMods() {
    loading = true
    error = null
    try {
      const result = await withTimeout(searchProjects({
        search,
        page: currentPage,
        size: pageSize,
        sort: sortBy,
        classification: classificationFilter
      }))
      mods = result.projects
      totalCount = result.pagination.totalElements
      totalPages = result.pagination.totalPages
    } catch (e) {
      console.error('Error loading mods:', e)
      error = e.message
    } finally {
      loading = false
    }
  }

  function handleSearchInput(e) {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      search = e.target.value
      currentPage = 0
      loadMods()
    }, 300)
  }

  function handleFilterChange() {
    currentPage = 0
    loadMods()
  }

  function nextPage() {
    if (currentPage + 1 < totalPages) {
      currentPage++
      loadMods()
      window.scrollTo(0, 0)
    }
  }

  function prevPage() {
    if (currentPage > 0) {
      currentPage--
      loadMods()
      window.scrollTo(0, 0)
    }
  }

  onMount(async () => {
    try {
      const [_, loadedTags] = await Promise.all([
        loadMods(),
        getTags().catch(() => [])
      ])
      tags = loadedTags || []
    } catch (e) {
      console.error('Error initializing:', e)
    }
  })

  function formatDate(dateString) {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function getClassificationLabel(classification) {
    const option = classificationOptions.find(o => o.value === classification)
    return option ? option.label : classification
  }
</script>

<div class="page">
  <Navbar currentPage="mods" {onnavigate} />

  <main class="main">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Mods</h1>
          <p class="page-subtitle">Browse Hytale mods, plugins, and content packs</p>
        </div>
      </div>

      <!-- Filters -->
      <Panel>
        <div class="filters">
          <div class="filter-row">
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search mods..."
                oninput={handleSearchInput}
              />
            </div>

            <div class="filter-group">
              <label class="filter-label">Type</label>
              <select bind:value={classificationFilter} onchange={handleFilterChange}>
                {#each classificationOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label">Sort by</label>
              <select bind:value={sortBy} onchange={handleFilterChange}>
                {#each sortOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
      </Panel>

      <!-- Results -->
      <div class="results-header">
        <span class="results-count">
          {#if loading}
            Loading...
          {:else if error}
            Error loading mods
          {:else}
            {totalCount.toLocaleString()} mod{totalCount !== 1 ? 's' : ''} found
          {/if}
        </span>
      </div>

      {#if error}
        <Panel>
          <div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h3>Failed to Load Mods</h3>
            <p>{error}</p>
            <Button variant="primary" onclick={loadMods}>Try Again</Button>
          </div>
        </Panel>
      {:else if loading}
        <div class="loading-grid">
          {#each Array(6) as _}
            <div class="skeleton-card"></div>
          {/each}
        </div>
      {:else if mods.length === 0}
        <Panel>
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <h3>No mods found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        </Panel>
      {:else}
        <div class="mods-grid">
          {#each mods as mod}
            <button
              class="mod-card"
              onclick={() => onnavigate(`mod-${mod.slug || mod.id}`)}
            >
              <div class="mod-icon">
                {#if mod.iconUrl}
                  <img src={mod.iconUrl} alt={mod.title} />
                {:else}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                {/if}
              </div>

              <div class="mod-info">
                <h3 class="mod-name">{mod.title}</h3>
                <p class="mod-summary">{mod.description}</p>

                <div class="mod-meta">
                  <span class="mod-author">by {mod.author}</span>
                </div>

                <div class="mod-categories">
                  <span class="category-tag type-tag">{getClassificationLabel(mod.classification)}</span>
                  {#each mod.tags.slice(0, 2) as tag}
                    <span class="category-tag">{tag}</span>
                  {/each}
                </div>
              </div>

              <div class="mod-stats">
                <div class="stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span class="stat-value">{formatDownloads(mod.downloads)}</span>
                </div>
                <div class="stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span class="stat-value">{formatRating(mod.rating)}</span>
                </div>
                <div class="stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span class="stat-value">{formatDate(mod.updatedAt)}</span>
                </div>
              </div>

              <div class="mod-actions">
                {#if getLatestDownloadUrl(mod)}
                  <a
                    href={getLatestDownloadUrl(mod)}
                    class="download-btn"
                    title="Download latest version"
                    onclick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </a>
                {/if}
                <div class="mod-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>
          {/each}
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="pagination">
            <button
              class="page-btn"
              onclick={prevPage}
              disabled={currentPage === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>

            <span class="page-info">
              Page {currentPage + 1} of {totalPages}
            </span>

            <button
              class="page-btn"
              onclick={nextPage}
              disabled={currentPage + 1 >= totalPages}
            >
              Next
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        {/if}
      {/if}

      <!-- Modtale Attribution -->
      <div class="attribution">
        <span>Powered by</span>
        <a href="https://modtale.net" target="_blank" rel="noopener noreferrer">
          Modtale
        </a>
      </div>
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
    padding: 3rem 1.5rem;
  }

  .container {
    max-width: 80rem;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  @media (min-width: 640px) {
    .page-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .page-subtitle {
    font-size: 1rem;
    color: #a89880;
    margin: 0.25rem 0 0 0;
  }

  /* Filters */
  .filters {
    padding: 0.5rem;
  }

  .filter-row {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .filter-row {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: flex-end;
    }
  }

  .search-box {
    flex: 1;
    min-width: 200px;
    position: relative;
  }

  .search-box svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: #8a7a6a;
  }

  .search-box input {
    width: 100%;
    padding: 0.65rem 0.75rem 0.65rem 2.5rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #f0e6d8;
    font-size: 0.9rem;
    transition: border-color 0.15s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #6bb8cc;
  }

  .search-box input::placeholder {
    color: #6a5a4a;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .filter-label {
    font-size: 0.75rem;
    color: #8a7a6a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .filter-group select {
    padding: 0.65rem 2rem 0.65rem 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 4px;
    color: #f0e6d8;
    font-size: 0.9rem;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238a7a6a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    transition: border-color 0.15s;
  }

  .filter-group select:focus {
    outline: none;
    border-color: #6bb8cc;
  }

  .filter-group select option {
    background: #2a241c;
    color: #f0e6d8;
  }

  /* Results */
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1.5rem 0 1rem 0;
  }

  .results-count {
    font-size: 0.9rem;
    color: #8a7a6a;
  }

  /* Mods Grid */
  .mods-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mod-card {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background:
      radial-gradient(ellipse at 30% 50%, rgba(60, 50, 40, 0.3) 0%, transparent 70%),
      linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 8px;
    text-decoration: none;
    text-align: left;
    width: 100%;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    transition: all 0.15s;
  }

  .mod-card:hover {
    border-color: #6b5a48;
    background:
      radial-gradient(ellipse at 30% 50%, rgba(70, 58, 46, 0.4) 0%, transparent 70%),
      linear-gradient(180deg, #302820 0%, #242018 100%);
  }

  .mod-icon {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .mod-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .mod-icon svg {
    width: 28px;
    height: 28px;
    color: #6a5a4a;
  }

  .mod-info {
    flex: 1;
    min-width: 0;
  }

  .mod-name {
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #f0e6d8;
    margin: 0 0 0.35rem 0;
  }

  .mod-summary {
    font-size: 0.85rem;
    color: #a89880;
    margin: 0 0 0.5rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .mod-meta {
    font-size: 0.8rem;
    color: #8a7a6a;
    margin-bottom: 0.5rem;
  }

  .mod-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .category-tag {
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    color: #c4b8a4;
    background: rgba(60, 50, 40, 0.5);
    border: 1px solid #4a3f32;
    border-radius: 3px;
  }

  .type-tag {
    background: rgba(107, 184, 204, 0.15);
    border-color: rgba(107, 184, 204, 0.4);
    color: #6bb8cc;
  }

  .mod-stats {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-align: right;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: #8a7a6a;
    font-size: 0.8rem;
  }

  .stat svg {
    width: 14px;
    height: 14px;
  }

  .stat-value {
    color: #c4b8a4;
  }

  .mod-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .download-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: linear-gradient(180deg, #3a5a3a 0%, #2d4a2d 100%);
    border: 1px solid #4a6a4a;
    border-radius: 6px;
    color: #8fbc8f;
    transition: all 0.15s;
  }

  .download-btn:hover {
    background: linear-gradient(180deg, #4a6a4a 0%, #3a5a3a 100%);
    border-color: #5a8a5a;
    color: #b8e0b8;
  }

  .download-btn svg {
    width: 18px;
    height: 18px;
  }

  .mod-arrow {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: #6a5a4a;
    transition: color 0.15s;
  }

  .mod-card:hover .mod-arrow {
    color: #d4a44c;
  }

  .mod-arrow svg {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 640px) {
    .mod-card {
      flex-wrap: wrap;
    }

    .mod-stats {
      width: 100%;
      flex-direction: row;
      justify-content: flex-start;
      gap: 1rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #3d3428;
    }

    .mod-arrow {
      display: none;
    }

    .download-btn {
      width: 32px;
      height: 32px;
    }
  }

  /* Loading skeleton */
  .loading-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .skeleton-card {
    height: 100px;
    background: linear-gradient(90deg, #2a241c 0%, #342c22 50%, #2a241c 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
    border: 1px solid #3d3428;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Empty & Error states */
  .empty-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 2rem;
    text-align: center;
  }

  .empty-state svg,
  .error-state svg {
    width: 64px;
    height: 64px;
    color: #6a5a4a;
    margin-bottom: 1rem;
  }

  .error-state svg {
    color: #c46b6b;
  }

  .empty-state h3,
  .error-state h3 {
    font-size: 1.25rem;
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  .empty-state p,
  .error-state p {
    color: #8a7a6a;
    margin: 0 0 1.5rem 0;
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
  }

  .page-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #c4b8a4;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .page-btn:hover:not(:disabled) {
    border-color: #6b5a48;
    color: #f0e6d8;
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-btn svg {
    width: 16px;
    height: 16px;
  }

  .page-info {
    font-size: 0.85rem;
    color: #8a7a6a;
  }

  /* Attribution */
  .attribution {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #3d3428;
    font-size: 0.85rem;
    color: #6a5a4a;
  }

  .attribution a {
    color: #6bb8cc;
    text-decoration: none;
    font-weight: 600;
  }

  .attribution a:hover {
    text-decoration: underline;
  }
</style>
