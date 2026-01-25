<script>
  import { onMount } from 'svelte'
  import Navbar from './lib/Navbar.svelte'
  import Hero from './lib/Hero.svelte'
  import Footer from './lib/Footer.svelte'
  import Panel from './lib/Panel.svelte'
  import Button from './lib/Button.svelte'
  import BuildCard from './lib/BuildCard.svelte'
  import ModCard from './lib/ModCard.svelte'
  import ServerCard from './lib/ServerCard.svelte'
  import ForumPost from './lib/ForumPost.svelte'
  import UploadPage from './lib/UploadPage.svelte'
  import ForumPage from './lib/ForumPage.svelte'
  import ForumCategoryPage from './lib/ForumCategoryPage.svelte'
  import ForumPostPage from './lib/ForumPostPage.svelte'
  import NewPostPage from './lib/NewPostPage.svelte'
  import ProfilePage from './lib/ProfilePage.svelte'
  import SettingsPage from './lib/SettingsPage.svelte'
  import ServersPage from './lib/ServersPage.svelte'
  import AddServerPage from './lib/AddServerPage.svelte'
  import ServerDetailPage from './lib/ServerDetailPage.svelte'
  import ModsPage from './lib/ModsPage.svelte'
  import ModDetailPage from './lib/ModDetailPage.svelte'
  import BuildsPage from './lib/BuildsPage.svelte'
  import BuildDetailPage from './lib/BuildDetailPage.svelte'
  import AdminPage from './lib/AdminPage.svelte'
  import ReportPage from './lib/ReportPage.svelte'
  import { auth } from './lib/stores/auth.svelte.js'
  import {
    fetchFeaturedBuilds,
    fetchFeaturedServers,
    fetchRecentPosts
  } from './lib/stores/data.svelte.js'
  import { searchProjects } from './lib/modtale.js'
  import { ensureConnection, markFailure, markSuccess } from './lib/supabase.js'

  // Simple page routing
  let currentPage = $state('home')

  // Parse route parameters from page string
  function getRouteParam(page, prefix) {
    if (page.startsWith(prefix)) {
      return page.slice(prefix.length)
    }
    return null
  }

  // Convert internal page state to URL path
  function pageToUrl(page) {
    if (page === 'home') return '/'
    if (page === 'forum') return '/forum'
    if (page === 'forum-new-post') return '/forum/new'
    if (page.startsWith('forum-new-post-')) return `/forum/new/${page.slice(15)}`
    if (page.startsWith('forum-category-')) return `/forum/category/${page.slice(15)}`
    if (page.startsWith('forum-post-')) return `/forum/post/${page.slice(11)}`
    if (page === 'mods') return '/mods'
    if (page.startsWith('mod-')) return `/mods/${page.slice(4)}`
    if (page === 'builds') return '/builds'
    if (page.startsWith('build-')) return `/builds/${page.slice(6)}`
    if (page === 'servers') return '/servers'
    if (page === 'servers-add') return '/servers/add'
    if (page.startsWith('server-')) return `/servers/${page.slice(7)}`
    if (page.startsWith('profile-')) return `/profile/${page.slice(8)}`
    if (page === 'settings') return '/settings'
    if (page === 'admin') return '/admin'
    if (page === 'report') return '/report'
    if (page === 'upload') return '/upload'
    return '/'
  }

  // Convert URL path to internal page state
  function urlToPage(pathname) {
    if (pathname === '/' || pathname === '') return 'home'

    // Remove leading slash and split
    const parts = pathname.replace(/^\//, '').split('/')

    if (parts[0] === 'forum') {
      if (parts.length === 1) return 'forum'
      if (parts[1] === 'new') return parts[2] ? `forum-new-post-${parts[2]}` : 'forum-new-post'
      if (parts[1] === 'category' && parts[2]) return `forum-category-${parts[2]}`
      if (parts[1] === 'post' && parts[2]) return `forum-post-${parts[2]}`
      return 'forum'
    }
    if (parts[0] === 'mods') {
      return parts[1] ? `mod-${parts[1]}` : 'mods'
    }
    if (parts[0] === 'builds') {
      return parts[1] ? `build-${parts[1]}` : 'builds'
    }
    if (parts[0] === 'servers') {
      if (parts[1] === 'add') return 'servers-add'
      return parts[1] ? `server-${parts[1]}` : 'servers'
    }
    if (parts[0] === 'profile' && parts[1]) {
      return `profile-${parts[1]}`
    }
    if (parts[0] === 'settings') return 'settings'
    if (parts[0] === 'admin') return 'admin'
    if (parts[0] === 'report') return 'report'
    if (parts[0] === 'upload') return 'upload'

    return 'home'
  }

  // Route protection - define which pages require authentication or admin
  function getRouteProtection(page) {
    // Admin only
    if (page === 'admin') return 'admin'

    // Requires authentication
    if (page === 'settings') return 'auth'
    if (page === 'upload') return 'auth'
    if (page === 'report') return 'auth'
    if (page === 'servers-add') return 'auth'
    if (page === 'forum-new-post' || page.startsWith('forum-new-post-')) return 'auth'

    // Public
    return 'public'
  }

  // Check if user can access a page
  function canAccessPage(page) {
    const protection = getRouteProtection(page)
    if (protection === 'public') return true
    if (protection === 'auth') return auth.isAuthenticated
    if (protection === 'admin') return auth.isAdmin
    return false
  }

  // Derived route info
  let forumCategorySlug = $derived(getRouteParam(currentPage, 'forum-category-'))
  let forumPostSlug = $derived(getRouteParam(currentPage, 'forum-post-'))
  let newPostCategorySlug = $derived(getRouteParam(currentPage, 'forum-new-post-') || '')
  let profileUsername = $derived(getRouteParam(currentPage, 'profile-'))
  let serverSlug = $derived(getRouteParam(currentPage, 'server-'))
  let modSlug = $derived(getRouteParam(currentPage, 'mod-'))
  let buildSlug = $derived(getRouteParam(currentPage, 'build-'))

  // Data fetched from Supabase and APIs
  let featuredBuilds = $state([])
  let popularMods = $state([])
  let featuredServers = $state([])
  let recentPosts = $state([])
  let loading = $state(true)
  let error = $state(null)
  let connectionFailed = $state(false)

  function navigate(page, replaceState = false) {
    // Check route protection
    if (!canAccessPage(page)) {
      // Redirect to home if not authorized
      page = 'home'
    }

    currentPage = page
    window.scrollTo(0, 0)

    // Update browser URL
    const url = pageToUrl(page)
    if (replaceState) {
      window.history.replaceState({ page }, '', url)
    } else {
      window.history.pushState({ page }, '', url)
    }
  }

  // Expose navigate globally for components
  if (typeof window !== 'undefined') {
    window.navigate = navigate

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      let page
      if (event.state && event.state.page) {
        page = event.state.page
      } else {
        // Fallback: parse URL if no state
        page = urlToPage(window.location.pathname)
      }

      // Check route protection
      if (!canAccessPage(page)) {
        // Replace history with home page
        window.history.replaceState({ page: 'home' }, '', '/')
        page = 'home'
      }

      currentPage = page
      window.scrollTo(0, 0)
    })
  }

  // Watch for auth state changes and redirect if on protected page
  $effect(() => {
    // This runs whenever auth state changes
    const isAuth = auth.isAuthenticated
    const isAdmin = auth.isAdmin

    // Check if current page is still accessible
    if (!canAccessPage(currentPage)) {
      navigate('home', true)
    }
  })

  // Fetch with retry logic and connection recovery - returns { data, failed } to track failures
  async function fetchWithRetry(name, fetchFn, fallback, retries = 2, timeout = 20000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // On retry attempts, try to ensure connection is healthy
        if (attempt > 0) {
          console.log(`${name}: Checking connection before retry...`)
          await ensureConnection()
        }

        const result = await Promise.race([
          fetchFn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ])
        markSuccess()
        return { data: result, failed: false }
      } catch (e) {
        console.warn(`${name} attempt ${attempt + 1} failed:`, e.message)
        markFailure()
        if (attempt === retries) {
          return { data: fallback, failed: true }
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
    return { data: fallback, failed: true }
  }

  async function initializeApp() {
    loading = true
    connectionFailed = false
    error = null

    // Initialize auth first (non-blocking)
    auth.initialize().catch(e => console.error('Auth init error:', e))

    // Fetch all featured content in parallel with retries
    try {
      const results = await Promise.all([
        fetchWithRetry('Builds', () => fetchFeaturedBuilds(4), [], 2, 20000),
        fetchWithRetry('Mods', () => searchProjects({ size: 4, sort: 'downloads' }), { projects: [] }, 2, 20000),
        fetchWithRetry('Servers', () => fetchFeaturedServers(4), [], 2, 20000),
        fetchWithRetry('Posts', () => fetchRecentPosts(5), [], 2, 20000)
      ])

      const [buildsResult, modsResult, serversResult, postsResult] = results

      // Check if ALL fetches failed
      const allFailed = results.every(r => r.failed)
      const someFailed = results.some(r => r.failed)

      if (allFailed) {
        console.error('All data fetches failed')
        connectionFailed = true
        loading = false
        return
      }

      if (someFailed) {
        const failedNames = []
        if (buildsResult.failed) failedNames.push('builds')
        if (modsResult.failed) failedNames.push('mods')
        if (serversResult.failed) failedNames.push('servers')
        if (postsResult.failed) failedNames.push('posts')
        console.warn('Some fetches failed:', failedNames.join(', '))
      }

      featuredBuilds = buildsResult.data
      popularMods = modsResult.data.projects || []
      featuredServers = serversResult.data
      recentPosts = postsResult.data
    } catch (e) {
      console.error('Error fetching data:', e)
      connectionFailed = true
    } finally {
      loading = false
    }
  }

  onMount(() => {
    // Parse initial URL and set page state
    let initialPage = urlToPage(window.location.pathname)

    // Check if auth is already loaded (from stored session) and page is protected
    // The $effect will also handle this once auth loads, but this catches immediate cases
    const protection = getRouteProtection(initialPage)
    if (protection !== 'public' && !auth.loading) {
      if (!canAccessPage(initialPage)) {
        initialPage = 'home'
      }
    }

    if (initialPage !== 'home') {
      currentPage = initialPage
    }

    // Replace current history state with page info
    window.history.replaceState({ page: currentPage }, '', pageToUrl(currentPage))

    initializeApp()
  })
</script>

{#if currentPage === 'admin'}
  <AdminPage onnavigate={navigate} />
{:else if currentPage === 'report'}
  <ReportPage onnavigate={navigate} />
{:else if currentPage === 'upload'}
  <UploadPage onnavigate={navigate} />
{:else if currentPage === 'forum'}
  <ForumPage onnavigate={navigate} />
{:else if forumCategorySlug}
  <ForumCategoryPage categorySlug={forumCategorySlug} onnavigate={navigate} />
{:else if forumPostSlug}
  <ForumPostPage postSlug={forumPostSlug} onnavigate={navigate} />
{:else if currentPage === 'forum-new-post' || currentPage.startsWith('forum-new-post-')}
  <NewPostPage categorySlug={newPostCategorySlug} onnavigate={navigate} />
{:else if profileUsername}
  <ProfilePage username={profileUsername} onnavigate={navigate} />
{:else if currentPage === 'settings'}
  <SettingsPage onnavigate={navigate} />
{:else if modSlug}
  <ModDetailPage modSlug={modSlug} onnavigate={navigate} />
{:else if currentPage === 'mods'}
  <ModsPage onnavigate={navigate} />
{:else if buildSlug}
  <BuildDetailPage buildSlug={buildSlug} onnavigate={navigate} />
{:else if currentPage === 'builds'}
  <BuildsPage onnavigate={navigate} />
{:else if currentPage === 'servers'}
  <ServersPage onnavigate={navigate} />
{:else if currentPage === 'servers-add'}
  <AddServerPage onnavigate={navigate} />
{:else if serverSlug}
  <ServerDetailPage serverSlug={serverSlug} onnavigate={navigate} />
{:else}
<div class="app">
  <Navbar currentPage="home" onnavigate={navigate} />

  <main>
    {#if connectionFailed}
      <div class="connection-error">
        <div class="connection-error-content">
          <svg class="connection-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2>Connection Error</h2>
          <p>Unable to connect to the server. This might be a temporary issue.</p>
          <Button variant="primary" onclick={() => initializeApp()}>
            Try Again
          </Button>
        </div>
      </div>
    {:else}
      <Hero onnavigate={navigate} />

    <!-- Servers Section -->
    <section class="section">
      <div class="container">
        <div class="section-panel">
          <div class="section-header">
            <div>
              <h2 class="section-title">Active Servers</h2>
              <p class="section-subtitle">Find a server and start playing</p>
            </div>
            <Button variant="secondary" onclick={() => navigate('servers')}>View All</Button>
          </div>

          <div class="server-grid">
            {#if loading}
              {#each Array(4) as _}
                <div class="skeleton-card server-skeleton"></div>
              {/each}
            {:else if featuredServers.length === 0}
              <p class="empty-message">No servers available</p>
            {:else}
              {#each featuredServers as server}
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
            {/if}
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Builds Section -->
    <section class="section">
      <div class="container">
        <div class="section-panel">
          <div class="section-header">
            <div>
              <h2 class="section-title">Featured Builds</h2>
              <p class="section-subtitle">Discover amazing creations from the community</p>
            </div>
            <Button variant="secondary" onclick={() => navigate('builds')}>View All</Button>
          </div>

          <div class="card-grid">
            {#if loading}
              {#each Array(4) as _}
                <div class="skeleton-card build-skeleton"></div>
              {/each}
            {:else if featuredBuilds.length === 0}
              <p class="empty-message">No builds available</p>
            {:else}
              {#each featuredBuilds as build}
                <BuildCard
                  title={build.title}
                  slug={build.slug}
                  author={build.author?.username}
                  thumbnail={build.thumbnail}
                  tags={build.tags}
                  downloads={build.download_count}
                  blocks={build.block_count}
                  votes={build.total_votes}
                />
              {/each}
            {/if}
          </div>
        </div>
      </div>
    </section>

    <!-- Popular Mods Section -->
    <section class="section">
      <div class="container">
        <div class="section-panel">
          <div class="section-header">
            <div>
              <h2 class="section-title">Popular Mods</h2>
              <p class="section-subtitle">Enhance your game with community mods</p>
            </div>
            <Button variant="secondary" onclick={() => navigate('mods')}>View All</Button>
          </div>

          <div class="mod-grid">
            {#if loading}
              {#each Array(4) as _}
                <div class="skeleton-card mod-skeleton"></div>
              {/each}
            {:else if popularMods.length === 0}
              <p class="empty-message">No mods available</p>
            {:else}
              {#each popularMods as mod}
                <ModCard
                  title={mod.title}
                  author={mod.author}
                  iconUrl={mod.iconUrl}
                  classification={mod.classification}
                  downloads={mod.downloads}
                  onclick={() => navigate(`mod-${mod.slug || mod.id}`)}
                />
              {/each}
            {/if}
          </div>
        </div>
      </div>
    </section>

    <!-- Forum Preview Section -->
    <section class="section">
      <div class="container">
        <div class="section-panel">
          <div class="section-header">
            <div>
              <h2 class="section-title">Community Forum</h2>
              <p class="section-subtitle">Join the conversation</p>
            </div>
            <Button variant="secondary" onclick={() => navigate('forum')}>Visit Forum</Button>
          </div>

          <div class="forum-list">
            {#if loading}
              {#each Array(3) as _}
                <div class="skeleton-card forum-skeleton"></div>
              {/each}
            {:else if recentPosts.length === 0}
              <p class="empty-message">No posts yet</p>
            {:else}
              {#each recentPosts as post, i}
                {#if i > 0}
                  <div class="forum-divider"></div>
                {/if}
                <ForumPost {...post} />
              {/each}
            {/if}
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section - only show to non-logged-in users -->
    {#if !auth.isAuthenticated}
      <section class="section cta-section">
        <div class="container">
          <div class="section-panel">
            <div class="cta-content">
              <h2 class="cta-title">Ready to Share Your Creations?</h2>
              <p class="cta-text">
                Join thousands of builders and adventurers. Upload your builds, share your worlds, and become part of the community.
              </p>
              <div class="cta-buttons">
                <Button variant="primary" onclick={() => auth.openModal()}>Create Account</Button>
                <Button variant="secondary">Learn More</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    {/if}
    {/if}
  </main>

  <Footer onnavigate={navigate} />
</div>
{/if}

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
  }

  .section {
    position: relative;
    padding: 1.5rem 1.5rem;
  }

  .section-panel {
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
    overflow: hidden;
  }

  .container {
    max-width: 80rem;
    margin: 0 auto;
  }

  .section-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  @media (min-width: 640px) {
    .section-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .section-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .section-subtitle {
    font-size: 0.95rem;
    color: #c4b8a4;
    margin: 0.25rem 0 0 0;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .card-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .card-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .mod-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .mod-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .mod-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .server-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
  }

  .server-grid > :global(*) {
    min-width: 0;
    max-width: 100%;
  }

  @media (min-width: 640px) {
    .server-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .server-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .forum-list {
    display: flex;
    flex-direction: column;
  }

  .forum-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #4a3f32, transparent);
    margin: 0.5rem 0;
  }

  .cta-section {
    padding: 2rem 1.5rem;
  }

  .cta-content {
    text-align: center;
    padding: 1.5rem 1rem;
  }

  @media (min-width: 640px) {
    .cta-content {
      padding: 2rem 2rem;
    }
  }

  .cta-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 1rem 0;
  }

  @media (min-width: 640px) {
    .cta-title {
      font-size: 2rem;
    }
  }

  .cta-text {
    font-size: 1rem;
    color: #c4b8a4;
    margin: 0 0 2rem 0;
    max-width: 32rem;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
  }

  @media (min-width: 480px) {
    .cta-buttons {
      flex-direction: row;
    }
  }

  /* Skeleton loading cards */
  .skeleton-card {
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

  .server-skeleton {
    height: 120px;
  }

  .build-skeleton {
    height: 200px;
  }

  .mod-skeleton {
    height: 80px;
  }

  .forum-skeleton {
    height: 60px;
    margin-bottom: 0.5rem;
  }

  .empty-message {
    color: #6b5a48;
    text-align: center;
    padding: 2rem;
    font-style: italic;
    grid-column: 1 / -1;
  }

  .connection-error {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 2rem;
  }

  .connection-error-content {
    text-align: center;
    max-width: 400px;
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 12px;
    padding: 3rem 2rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .connection-error-icon {
    width: 64px;
    height: 64px;
    color: #c9973b;
    margin-bottom: 1.5rem;
  }

  .connection-error-content h2 {
    color: #f5d898;
    font-size: 1.5rem;
    margin: 0 0 0.75rem 0;
  }

  .connection-error-content p {
    color: #a89a8c;
    font-size: 1rem;
    line-height: 1.5;
    margin: 0 0 1.5rem 0;
  }
</style>
