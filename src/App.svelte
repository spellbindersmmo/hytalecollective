<script>
  import { onMount } from 'svelte'
  import Navbar from './lib/Navbar.svelte'
  import Hero from './lib/Hero.svelte'
  import Footer from './lib/Footer.svelte'
  import Panel from './lib/Panel.svelte'
  import Button from './lib/Button.svelte'
  import BuildCard from './lib/BuildCard.svelte'
  import ServerCard from './lib/ServerCard.svelte'
  import ForumPost from './lib/ForumPost.svelte'
  import UploadPage from './lib/UploadPage.svelte'
  import ForumPage from './lib/ForumPage.svelte'
  import ForumCategoryPage from './lib/ForumCategoryPage.svelte'
  import ForumPostPage from './lib/ForumPostPage.svelte'
  import NewPostPage from './lib/NewPostPage.svelte'
  import ProfilePage from './lib/ProfilePage.svelte'
  import SettingsPage from './lib/SettingsPage.svelte'
  import { auth } from './lib/stores/auth.svelte.js'
  import {
    fetchFeaturedBuilds,
    fetchFeaturedWorlds,
    fetchFeaturedServers,
    fetchRecentPosts
  } from './lib/stores/data.svelte.js'

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

  // Data fetched from Supabase
  let featuredBuilds = $state([])
  let featuredWorlds = $state([])
  let featuredServers = $state([])
  let recentPosts = $state([])
  let loading = $state(true)
  let error = $state(null)

  function navigate(page) {
    currentPage = page
    window.scrollTo(0, 0)
  }

  // Expose navigate globally for components
  if (typeof window !== 'undefined') {
    window.navigate = navigate
  }

  onMount(async () => {
    // Initialize auth
    await auth.initialize()

    // Fetch all featured content in parallel
    try {
      const [builds, worlds, servers, posts] = await Promise.all([
        fetchFeaturedBuilds(4).catch(() => []),
        fetchFeaturedWorlds(4).catch(() => []),
        fetchFeaturedServers(4).catch(() => []),
        fetchRecentPosts(5).catch(() => [])
      ])

      featuredBuilds = builds
      featuredWorlds = worlds
      featuredServers = servers
      recentPosts = posts
    } catch (e) {
      console.error('Error fetching data:', e)
      error = e.message
    } finally {
      loading = false
    }
  })
</script>

{#if currentPage === 'upload'}
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
{:else}
<div class="app">
  <Navbar currentPage="home" onnavigate={navigate} />

  <main>
    <Hero onnavigate={navigate} />

    <!-- Featured Builds Section -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Featured Builds</h2>
            <p class="section-subtitle">Discover amazing creations from the community</p>
          </div>
          <Button variant="secondary" href="/builds">View All</Button>
        </div>

        <div class="card-grid">
          {#each featuredBuilds as build}
            <BuildCard {...build} />
          {/each}
        </div>
      </div>
    </section>

    <!-- Featured Worlds Section -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Popular Worlds</h2>
            <p class="section-subtitle">Download and explore custom worlds</p>
          </div>
          <Button variant="secondary" href="/worlds">View All</Button>
        </div>

        <div class="card-grid">
          {#each featuredWorlds as world}
            <BuildCard {...world} />
          {/each}
        </div>
      </div>
    </section>

    <!-- Servers Section -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Active Servers</h2>
            <p class="section-subtitle">Find a server and start playing</p>
          </div>
          <Button variant="secondary" href="/servers">View All</Button>
        </div>

        <div class="server-grid">
          {#each featuredServers as server}
            <ServerCard {...server} />
          {/each}
        </div>
      </div>
    </section>

    <!-- Forum Preview Section -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Community Forum</h2>
            <p class="section-subtitle">Join the conversation</p>
          </div>
          <Button variant="secondary" onclick={() => navigate('forum')}>Visit Forum</Button>
        </div>

        <Panel>
          <div class="forum-list">
            {#each recentPosts as post, i}
              {#if i > 0}
                <div class="forum-divider"></div>
              {/if}
              <ForumPost {...post} />
            {/each}
          </div>
        </Panel>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section cta-section">
      <div class="container">
        <Panel>
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
        </Panel>
      </div>
    </section>
  </main>

  <Footer />
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
    padding: 4rem 1.5rem;
  }

  .section-alt {
    background:
      radial-gradient(ellipse 80% 60% at 25% 30%, rgba(58, 48, 36, 0.4) 0%, transparent 50%),
      radial-gradient(ellipse 70% 70% at 75% 70%, rgba(52, 42, 32, 0.35) 0%, transparent 45%),
      radial-gradient(ellipse 50% 40% at 50% 50%, rgba(62, 52, 40, 0.25) 0%, transparent 50%),
      linear-gradient(180deg, rgba(22, 18, 14, 0.8) 0%, rgba(18, 15, 12, 0.85) 50%, rgba(22, 18, 14, 0.8) 100%);
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
</style>
