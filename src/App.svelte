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
  import { auth } from './lib/stores/auth.svelte.js'
  import {
    fetchFeaturedBuilds,
    fetchFeaturedServers,
    fetchRecentPosts
  } from './lib/stores/data.svelte.js'
  import { searchProjects } from './lib/modtale.js'
  import { checkConnection } from './lib/supabase.js'

  // Simple page routing
  let currentPage = $state('home')

  // Parse route parameters from page string
  function getRouteParam(page, prefix) {
    if (page.startsWith(prefix)) {
      return page.slice(prefix.length)
    }
    return null
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

  function navigate(page) {
    currentPage = page
    window.scrollTo(0, 0)
  }

  // Expose navigate globally for components
  if (typeof window !== 'undefined') {
    window.navigate = navigate
  }

  // Fetch with retry logic for resilience
  async function fetchWithRetry(fetchFn, fallback, retries = 2, timeout = 15000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await Promise.race([
          fetchFn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ])
        return result
      } catch (e) {
        console.warn(`Fetch attempt ${attempt + 1} failed:`, e.message)
        if (attempt === retries) {
          return fallback
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    return fallback
  }

  async function initializeApp() {
    loading = true
    connectionFailed = false
    error = null

    // First, check if Supabase is reachable (with retries)
    let connected = false
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`Connection attempt ${attempt + 1}...`)
      connected = await checkConnection()
      if (connected) break
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (!connected) {
      console.error('Failed to connect to Supabase after 3 attempts')
      connectionFailed = true
      loading = false
      return
    }

    // Initialize auth (non-blocking)
    auth.initialize().catch(e => console.error('Auth init error:', e))

    // Fetch all featured content in parallel with retries
    try {
      const [builds, modsData, servers, posts] = await Promise.all([
        fetchWithRetry(() => fetchFeaturedBuilds(4), []),
        fetchWithRetry(() => searchProjects({ size: 4, sort: 'downloads' }), { projects: [] }),
        fetchWithRetry(() => fetchFeaturedServers(4), []),
        fetchWithRetry(() => fetchRecentPosts(5), [])
      ])

      featuredBuilds = builds
      popularMods = modsData.projects || []
      featuredServers = servers
      recentPosts = posts
    } catch (e) {
      console.error('Error fetching data:', e)
      error = e.message
    } finally {
      loading = false
    }
  }

  onMount(() => {
    initializeApp()
  })
</script>

{#if currentPage === 'admin'}
  <AdminPage onnavigate={navigate} />
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
                  author={build.author?.username}
                  thumbnail={build.thumbnail}
                  tags={build.tags}
                  downloads={build.download_count}
                  blocks={build.block_count}
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

    <!-- CTA Section -->
    <section class="section cta-section">
      <div class="container">
        <div class="section-panel">
          <div class="cta-content">
            <h2 class="cta-title">Ready to Share Your Creations?</h2>
            <p class="cta-text">
              Join thousands of builders and adventurers. Upload your builds, share your worlds, and become part of the community.
            </p>
            <div class="cta-buttons">
              <Button variant="primary">Create Account</Button>
              <Button variant="secondary">Learn More</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
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
    padding: 3rem 1.5rem;
  }

  .section-panel {
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
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

  @media (min-width: 768px) {
    .server-grid {
      grid-template-columns: repeat(2, 1fr);
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
    padding: 5rem 1.5rem;
  }

  .cta-content {
    text-align: center;
    padding: 2rem 1rem;
  }

  @media (min-width: 640px) {
    .cta-content {
      padding: 3rem 2rem;
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
