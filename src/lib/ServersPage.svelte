<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import ServerCard from './ServerCard.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { fetchServers, fetchServerTags } from './stores/data.svelte.js'

  let { onnavigate = () => {} } = $props()

  // State
  let servers = $state([])
  let tags = $state([])
  let loading = $state(true)
  let totalServers = $state(0)

  // Filters
  let search = $state('')
  let statusFilter = $state('all')
  let tagFilter = $state('')
  let sortBy = $state('current_players')
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

  async function loadServers() {
    loading = true
    try {
      const result = await withTimeout(fetchServers({
        page: currentPage,
        limit,
        status: statusFilter !== 'all' ? statusFilter : null,
        tag: tagFilter || null,
        search: search || null,
        sortBy
      }))
      servers = result.servers
      totalServers = result.total
    } catch (e) {
      console.error('Error loading servers:', e)
    } finally {
      loading = false
    }
  }

  function handleSearchInput(e) {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      search = e.target.value
      currentPage = 1
      loadServers()
    }, 300)
  }

  function handleFilterChange() {
    currentPage = 1
    loadServers()
  }

  function nextPage() {
    if (currentPage * limit < totalServers) {
      currentPage++
      loadServers()
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      currentPage--
      loadServers()
    }
  }

  onMount(async () => {
    try {
      const [_, tagsData] = await Promise.all([
        loadServers(),
        fetchServerTags()
      ])
      tags = tagsData || []
    } catch (e) {
      console.error('Error initializing:', e)
    }
  })

  const totalPages = $derived(Math.ceil(totalServers / limit))
</script>

<div class="page">
  <Navbar currentPage="servers" {onnavigate} />

  <main class="main">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Servers</h1>
          <p class="page-subtitle">Find and join community servers</p>
        </div>
        {#if auth.isAuthenticated}
          <Button variant="primary" onclick={() => onnavigate('servers-add')}>
            Add Your Server
          </Button>
        {:else}
          <Button variant="secondary" onclick={() => auth.openModal()}>
            Login to Add Server
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
                placeholder="Search servers..."
                oninput={handleSearchInput}
              />
            </div>

            <div class="filter-group">
              <label class="filter-label">Status</label>
              <select bind:value={statusFilter} onchange={handleFilterChange}>
                <option value="all">All</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
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
                <option value="current_players">Players</option>
                <option value="total_votes">Votes</option>
                <option value="created_at">Newest</option>
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
            {totalServers} server{totalServers !== 1 ? 's' : ''} found
          {/if}
        </span>
      </div>

      {#if loading}
        <div class="loading-grid">
          {#each Array(6) as _}
            <div class="skeleton-card"></div>
          {/each}
        </div>
      {:else if servers.length === 0}
        <Panel>
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <h3>No servers found</h3>
            <p>Try adjusting your filters or be the first to add a server!</p>
            {#if auth.isAuthenticated}
              <Button variant="primary" onclick={() => onnavigate('servers-add')}>
                Add Your Server
              </Button>
            {/if}
          </div>
        </Panel>
      {:else}
        <div class="server-grid">
          {#each servers as server}
            <ServerCard
              name={server.name}
              slug={server.slug}
              description={server.short_description || server.description}
              players={server.current_players}
              maxPlayers={server.max_players}
              tags={server.tags}
              online={server.status === 'online'}
              icon={server.icon}
              banner={server.banner}
              source={server.source}
              votes={server.total_votes}
            />
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

  .server-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .server-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .server-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Loading skeleton */
  .loading-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
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
    height: 140px;
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
</style>
