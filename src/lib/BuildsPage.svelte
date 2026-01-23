<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { fetchBuilds, fetchPopularTags } from './stores/data.svelte.js'

  let { onnavigate = () => {} } = $props()

  // State
  let builds = $state([])
  let tags = $state([])
  let loading = $state(true)
  let totalBuilds = $state(0)

  // Filters
  let search = $state('')
  let tagFilter = $state('')
  let sortBy = $state('download_count')
  let currentPage = $state(1)
  const limit = 12

  // Debounced search
  let searchTimeout = null

  // Timeout wrapper
  function withTimeout(promise, ms = 10000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms))
    ])
  }

  // Sort options
  const sortOptions = [
    { value: 'download_count', label: 'Most Downloads' },
    { value: 'created_at', label: 'Newest' },
    { value: 'title', label: 'Name' }
  ]

  async function loadBuilds() {
    loading = true
    try {
      const result = await withTimeout(fetchBuilds({
        page: currentPage,
        limit,
        tag: tagFilter || null,
        search: search || null,
        sortBy
      }))
      builds = result.builds
      totalBuilds = result.total
    } catch (e) {
      console.error('Error loading builds:', e)
    } finally {
      loading = false
    }
  }

  function handleSearchInput(e) {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      search = e.target.value
      currentPage = 1
      loadBuilds()
    }, 300)
  }

  function handleFilterChange() {
    currentPage = 1
    loadBuilds()
  }

  function nextPage() {
    if (currentPage * limit < totalBuilds) {
      currentPage++
      loadBuilds()
      window.scrollTo(0, 0)
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--
      loadBuilds()
      window.scrollTo(0, 0)
    }
  }

  onMount(async () => {
    try {
      const [_, tagsData] = await Promise.all([
        loadBuilds(),
        fetchPopularTags(30)
      ])
      tags = tagsData || []
    } catch (e) {
      console.error('Error initializing:', e)
    }
  })

  const totalPages = $derived(Math.ceil(totalBuilds / limit))

  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }
</script>

<div class="page">
  <Navbar currentPage="builds" {onnavigate} />

  <main class="main">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Builds</h1>
          <p class="page-subtitle">Discover amazing creations from the community</p>
        </div>
        {#if auth.isAuthenticated}
          <Button variant="primary" onclick={() => onnavigate('upload')}>
            Upload Build
          </Button>
        {:else}
          <Button variant="secondary" onclick={() => auth.openModal()}>
            Login to Upload
          </Button>
        {/if}
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
                placeholder="Search builds..."
                oninput={handleSearchInput}
              />
            </div>

            <div class="filter-group">
              <label class="filter-label">Tag</label>
              <select bind:value={tagFilter} onchange={handleFilterChange}>
                <option value="">All Tags</option>
                {#each tags as tag}
                  <option value={tag.slug}>{tag.name}</option>
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
          {:else}
            {totalBuilds.toLocaleString()} build{totalBuilds !== 1 ? 's' : ''} found
          {/if}
        </span>
      </div>

      {#if loading}
        <div class="loading-grid">
          {#each Array(6) as _}
            <div class="skeleton-card"></div>
          {/each}
        </div>
      {:else if builds.length === 0}
        <Panel>
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            <h3>No builds found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        </Panel>
      {:else}
        <div class="builds-grid">
          {#each builds as build}
            <button
              class="build-card"
              onclick={() => onnavigate(`build-${build.slug}`)}
            >
              <div class="build-thumbnail">
                {#if build.thumbnail}
                  <img src={build.thumbnail} alt={build.title} />
                {/if}
                <div class="thumbnail-overlay"></div>
              </div>

              <div class="build-content">
                <h3 class="build-title">{build.title}</h3>
                <p class="build-author">by {build.author?.username || 'Unknown'}</p>

                {#if build.tags && build.tags.length > 0}
                  <div class="build-tags">
                    {#each build.tags.slice(0, 3) as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                {/if}

                <div class="build-stats">
                  <span class="stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {formatNumber(build.download_count || 0)}
                  </span>
                  {#if build.block_count}
                    <span class="stat">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      </svg>
                      {formatNumber(build.block_count)}
                    </span>
                  {/if}
                  <span class="stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    {formatNumber(build.view_count || 0)}
                  </span>
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
              disabled={currentPage === 1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>

            <span class="page-info">
              Page {currentPage} of {totalPages}
            </span>

            <button
              class="page-btn"
              onclick={nextPage}
              disabled={currentPage >= totalPages}
            >
              Next
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        {/if}
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

  /* Builds Grid */
  .builds-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .builds-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .builds-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 1280px) {
    .builds-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .build-card {
    background:
      linear-gradient(180deg,
        #5a4d3e 0%,
        #4d4235 15%,
        #453a2e 50%,
        #3a3127 85%,
        #322a22 100%
      );
    border: 1px solid #6b5a48;
    border-radius: 6px;
    padding: 4px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: all 0.2s ease;
  }

  .build-card:hover {
    transform: translateY(-3px);
    border-color: #9c8465;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.5),
      0 8px 24px rgba(0, 0, 0, 0.35),
      0 0 30px rgba(212, 164, 76, 0.12);
  }

  .build-thumbnail {
    position: relative;
    height: 140px;
    background:
      radial-gradient(ellipse at 30% 40%, rgba(55, 46, 35, 0.6) 0%, transparent 60%),
      linear-gradient(180deg, #2a241c 0%, #1a1714 100%);
    border-radius: 4px 4px 0 0;
    overflow: hidden;
  }

  .build-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .build-card:hover .build-thumbnail img {
    transform: scale(1.05);
  }

  .thumbnail-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 40%, rgba(26, 23, 20, 0.85) 100%);
    pointer-events: none;
  }

  .build-content {
    padding: 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #221d17 100%);
    border-radius: 0 0 4px 4px;
  }

  .build-title {
    font-family: 'Cinzel', serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .build-author {
    font-size: 0.75rem;
    color: #c4b8a4;
    margin: 0.2rem 0 0 0;
  }

  .build-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.5rem;
  }

  .tag {
    padding: 0.1rem 0.4rem;
    font-size: 0.65rem;
    font-weight: 500;
    color: #c4b8a4;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 2px;
  }

  .build-stats {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.6rem;
    padding-top: 0.5rem;
    border-top: 1px solid #3a3127;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: #c4b8a4;
  }

  .stat svg {
    width: 12px;
    height: 12px;
    color: #d4a44c;
  }

  /* Loading skeleton */
  .loading-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .loading-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .loading-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .skeleton-card {
    height: 220px;
    background: linear-gradient(90deg, #2a241c 0%, #342c22 50%, #2a241c 100%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
    border: 1px solid #3d3428;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 2rem;
    text-align: center;
  }

  .empty-state svg {
    width: 64px;
    height: 64px;
    color: #6a5a4a;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    font-size: 1.25rem;
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    color: #8a7a6a;
    margin: 0;
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
</style>
