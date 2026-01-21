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

  onMount(async () => {
    try {
      const [cats, posts] = await Promise.all([
        fetchForumCategories(),
        fetchRecentPosts(10)
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
      general: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />`,
      help: `<circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />`,
      showcase: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />`,
      news: `<path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0" />`,
      discussion: `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />`,
      servers: `<rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />`
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
          <h2 class="section-title">Categories</h2>

          {#if loading}
            <Panel>
              <div class="loading">Loading categories...</div>
            </Panel>
          {:else}
            <div class="categories-grid">
              {#each categories as category}
                <button
                  class="category-card"
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

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #c4b8a4;
    margin: 0 0 1rem 0;
  }

  /* Categories Grid */
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .categories-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .categories-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .category-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background:
      radial-gradient(ellipse at 30% 50%, rgba(60, 50, 40, 0.3) 0%, transparent 70%),
      linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 8px;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
  }

  .category-card:hover {
    border-color: #6b5a48;
    background:
      radial-gradient(ellipse at 30% 50%, rgba(70, 58, 46, 0.4) 0%, transparent 70%),
      linear-gradient(180deg, #302820 0%, #242018 100%);
  }

  .category-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid;
    border-radius: 8px;
  }

  .category-icon svg {
    width: 24px;
    height: 24px;
  }

  .category-info {
    flex: 1;
    min-width: 0;
  }

  .category-name {
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #f0e6d8;
    margin: 0 0 0.25rem 0;
  }

  .category-description {
    font-size: 0.8rem;
    color: #8a7a6a;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .category-stats {
    flex-shrink: 0;
    text-align: center;
  }

  .post-count {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: #d4a44c;
  }

  .post-label {
    font-size: 0.7rem;
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
