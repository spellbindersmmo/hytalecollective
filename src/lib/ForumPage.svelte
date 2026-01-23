<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import ForumPost from './ForumPost.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { fetchForumCategories, fetchRecentPosts } from './stores/data.svelte.js'

  let { onnavigate = () => {} } = $props()

  let categories = $state([])
  let recentPosts = $state([])
  let loading = $state(true)

  // Group categories by section
  const hytaleCategories = $derived(
    categories.filter(c => c.section === 'hytale' || !c.section)
  )
  const websiteCategories = $derived(
    categories.filter(c => c.section === 'website')
  )

  // Timeout wrapper
  function withTimeout(promise, ms = 10000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms))
    ])
  }

  onMount(async () => {
    try {
      const [cats, posts] = await Promise.all([
        withTimeout(fetchForumCategories()).catch(() => []),
        withTimeout(fetchRecentPosts(10)).catch(() => [])
      ])
      categories = cats
      recentPosts = posts
    } catch (e) {
      console.error('Error loading forum:', e)
    } finally {
      loading = false
    }
  })

  function getCategoryIcon(slug) {
    const icons = {
      // Hytale categories
      'news-announcements': `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />`,
      general: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />`,
      help: `<circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />`,
      showcase: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />`,
      discussion: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />`,
      servers: `<rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />`,
      'videos-streaming': `<polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />`,
      mods: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />`,
      wiki: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />`,
      guides: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />`,
      // Website categories
      'feedback-suggestions': `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />`,
      'contests-giveaways': `<circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />`
    }
    return icons[slug] || icons.general
  }
</script>

<div class="page">
  <Navbar currentPage="forum" {onnavigate} />

  <main class="main">
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Community Forum</h1>
          <p class="page-subtitle">Discuss, share, and connect with fellow Hytale enthusiasts</p>
        </div>
        {#if auth.isAuthenticated}
          <Button variant="primary" onclick={() => onnavigate('forum-new-post')}>
            New Post
          </Button>
        {/if}
      </div>

      <div class="forum-layout">
        <!-- Categories Section -->
        <section class="categories-section">
          {#if loading}
            <Panel>
              <div class="loading">Loading categories...</div>
            </Panel>
          {:else}
            <!-- Hytale Categories -->
            {#if hytaleCategories.length > 0}
              <div class="category-group">
                <Panel>
                  <div class="group-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                    <h2 class="group-title">Hytale</h2>
                  </div>
                  <div class="categories-list">
                    {#each hytaleCategories as category, i}
                      {#if i > 0}
                        <div class="category-divider"></div>
                      {/if}
                      <button
                        class="category-row"
                        onclick={() => onnavigate(`forum-category-${category.slug}`)}
                      >
                        <div class="category-icon" style="background-color: {category.color}20; border-color: {category.color}40;">
                          <svg viewBox="0 0 24 24" fill="none" stroke={category.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            {@html getCategoryIcon(category.slug)}
                          </svg>
                        </div>
                        <div class="category-info">
                          <h3 class="category-name">{category.name}</h3>
                          <p class="category-description">{category.description}</p>
                        </div>
                        <div class="category-stats">
                          <span class="post-count">{category.post_count || 0}</span>
                          <span class="post-label">posts</span>
                        </div>
                      </button>
                    {/each}
                  </div>
                </Panel>
              </div>
            {/if}

            <!-- Website Categories -->
            {#if websiteCategories.length > 0}
              <div class="category-group">
                <Panel>
                  <div class="group-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <h2 class="group-title">Hytale Collective</h2>
                  </div>
                  <div class="categories-list">
                    {#each websiteCategories as category, i}
                      {#if i > 0}
                        <div class="category-divider"></div>
                      {/if}
                      <button
                        class="category-row"
                        onclick={() => onnavigate(`forum-category-${category.slug}`)}
                      >
                        <div class="category-icon" style="background-color: {category.color}20; border-color: {category.color}40;">
                          <svg viewBox="0 0 24 24" fill="none" stroke={category.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            {@html getCategoryIcon(category.slug)}
                          </svg>
                        </div>
                        <div class="category-info">
                          <h3 class="category-name">{category.name}</h3>
                          <p class="category-description">{category.description}</p>
                        </div>
                        <div class="category-stats">
                          <span class="post-count">{category.post_count || 0}</span>
                          <span class="post-label">posts</span>
                        </div>
                      </button>
                    {/each}
                  </div>
                </Panel>
              </div>
            {/if}
          {/if}
        </section>

        <!-- Recent Posts Section -->
        <section class="recent-section">
          <h2 class="section-title">Recent Activity</h2>

          <Panel>
            {#if loading}
              <div class="loading">Loading posts...</div>
            {:else if recentPosts.length === 0}
              <div class="empty-state">
                <p>No posts yet. Be the first to start a discussion!</p>
              </div>
            {:else}
              <div class="posts-list">
                {#each recentPosts as post, i}
                  {#if i > 0}
                    <div class="post-divider"></div>
                  {/if}
                  <button
                    class="post-item"
                    onclick={() => onnavigate(`forum-post-${post.slug}`)}
                  >
                    <ForumPost
                      title={post.title}
                      author={post.author?.username || 'Unknown'}
                      category={post.category}
                      replies={post.reply_count}
                      views={post.view_count}
                      lastActivity={post.lastActivity}
                    />
                  </button>
                {/each}
              </div>
            {/if}
          </Panel>
        </section>
      </div>
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
    margin-bottom: 2.5rem;
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

  .forum-layout {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  /* Category Groups */
  .category-group {
    margin-bottom: 1.5rem;
  }

  .category-group:last-child {
    margin-bottom: 0;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, rgba(60, 50, 40, 0.5) 0%, rgba(40, 34, 26, 0.3) 100%);
    border-bottom: 1px solid #3d3428;
    margin: -1rem -1rem 0 -1rem;
    border-radius: 6px 6px 0 0;
  }

  .group-header svg {
    width: 20px;
    height: 20px;
    color: #d4a44c;
  }

  .group-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Categories List */
  .categories-list {
    display: flex;
    flex-direction: column;
    margin-top: 0.5rem;
  }

  .category-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #3d3428 20%, #3d3428 80%, transparent);
    margin: 0;
  }

  .category-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 0.5rem;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
    border-radius: 4px;
    margin: 0 -0.5rem;
    width: calc(100% + 1rem);
  }

  .category-row:hover {
    background: rgba(60, 50, 40, 0.4);
  }

  .category-icon {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid;
    border-radius: 6px;
  }

  .category-icon svg {
    width: 20px;
    height: 20px;
  }

  .category-info {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .category-name {
    font-family: 'Cinzel', serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #f0e6d8;
    margin: 0 0 0.2rem 0;
  }

  .category-description {
    font-size: 0.8rem;
    color: #8a7a6a;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 640px) {
    .category-description {
      display: none;
    }
  }

  .category-stats {
    flex-shrink: 0;
    text-align: center;
    min-width: 50px;
    padding-right: 0.5rem;
  }

  .post-count {
    display: block;
    font-size: 1.1rem;
    font-weight: 700;
    color: #d4a44c;
  }

  .post-label {
    font-size: 0.65rem;
    color: #8a7a6a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Posts List */
  .posts-list {
    display: flex;
    flex-direction: column;
  }

  .post-item {
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
  }

  .post-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #4a3f32, transparent);
    margin: 0.5rem 0;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: #8a7a6a;
  }

  .empty-state {
    padding: 3rem 2rem;
    text-align: center;
    color: #8a7a6a;
  }
</style>
