<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import ForumPost from './ForumPost.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase } from './supabase.js'

  let { categorySlug = '', onnavigate = () => {} } = $props()

  let category = $state(null)
  let posts = $state([])
  let loading = $state(true)
  let page = $state(1)
  let totalPages = $state(1)
  const limit = 20

  // Check if current category is admin-only
  function isAdminOnlyCategory(cat) {
    if (!cat) return false
    const slug = cat.slug?.toLowerCase() || ''
    return slug.includes('news') || slug.includes('announcement') || cat.admin_only === true
  }

  // Can the current user post in this category?
  const canPost = $derived(
    auth.isAuthenticated && (!isAdminOnlyCategory(category) || auth.isAdmin)
  )

  onMount(() => {
    loadCategory()
  })

  async function loadCategory() {
    loading = true
    try {
      // Fetch category info
      const { data: catData, error: catError } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single()

      if (catError) throw catError
      category = catData

      // Fetch posts
      await loadPosts()
    } catch (e) {
      console.error('Error loading category:', e)
    } finally {
      loading = false
    }
  }

  async function loadPosts() {
    const { data, error, count } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles(username, avatar_url),
        category:forum_categories(name, slug, color)
      `, { count: 'exact' })
      .eq('category_id', category.id)
      .order('is_pinned', { ascending: false })
      .order('last_activity_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (!error) {
      posts = data.map(post => ({
        ...post,
        lastActivity: formatRelativeTime(post.last_activity_at)
      }))
      totalPages = Math.ceil((count || 0) / limit)
    }
  }

  function formatRelativeTime(date) {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return then.toLocaleDateString()
  }

  async function goToPage(newPage) {
    page = newPage
    await loadPosts()
    window.scrollTo(0, 0)
  }
</script>

<div class="page">
  <Navbar currentPage="forum" {onnavigate} />

  <main class="main">
    <div class="container">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <button onclick={() => onnavigate('forum')}>Forum</button>
        <span class="separator">/</span>
        <span class="current">{category?.name || 'Loading...'}</span>
      </nav>

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title" style="color: {category?.color || '#f5d898'}">
            {category?.name || 'Loading...'}
          </h1>
          <p class="page-subtitle">{category?.description || ''}</p>
        </div>
        {#if canPost}
          <Button variant="primary" onclick={() => onnavigate(`forum-new-post-${categorySlug}`)}>
            New Post
          </Button>
        {/if}
      </div>

      <!-- Posts List -->
      <Panel>
        {#if loading}
          <div class="loading">Loading posts...</div>
        {:else if posts.length === 0}
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3>No posts yet</h3>
            <p>Be the first to start a discussion in this category!</p>
            {#if canPost}
              <Button variant="primary" onclick={() => onnavigate(`forum-new-post-${categorySlug}`)}>
                Create Post
              </Button>
            {/if}
          </div>
        {:else}
          <div class="posts-list">
            {#each posts as post, i}
              {#if i > 0}
                <div class="post-divider"></div>
              {/if}
              <button
                class="post-item"
                class:pinned={post.is_pinned}
                onclick={() => onnavigate(`forum-post-${post.slug}`)}
              >
                {#if post.is_pinned}
                  <div class="pin-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z" />
                    </svg>
                    Pinned
                  </div>
                {/if}
                <ForumPost
                  title={post.title}
                  author={post.author?.username || 'Unknown'}
                  category={post.category?.name || category?.name}
                  replies={post.reply_count}
                  views={post.view_count}
                  lastActivity={post.lastActivity}
                />
              </button>
            {/each}
          </div>

          <!-- Pagination -->
          {#if totalPages > 1}
            <div class="pagination">
              <button
                class="page-btn"
                disabled={page === 1}
                onclick={() => goToPage(page - 1)}
              >
                Previous
              </button>
              <span class="page-info">Page {page} of {totalPages}</span>
              <button
                class="page-btn"
                disabled={page === totalPages}
                onclick={() => goToPage(page + 1)}
              >
                Next
              </button>
            </div>
          {/if}
        {/if}
      </Panel>
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
    padding: 2rem 1.5rem 3rem;
  }

  .container {
    max-width: 60rem;
    margin: 0 auto;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }

  .breadcrumb button {
    background: none;
    border: none;
    color: #d4a44c;
    cursor: pointer;
    padding: 0;
  }

  .breadcrumb button:hover {
    text-decoration: underline;
  }

  .breadcrumb .separator {
    color: #6b5a48;
  }

  .breadcrumb .current {
    color: #a89880;
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
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0;
  }

  .page-subtitle {
    font-size: 0.95rem;
    color: #a89880;
    margin: 0.25rem 0 0 0;
  }

  .posts-list {
    display: flex;
    flex-direction: column;
  }

  .post-item {
    position: relative;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
  }

  .post-item.pinned {
    background: rgba(212, 164, 76, 0.05);
    margin: -0.5rem -1rem;
    padding: 0.5rem 1rem;
    width: calc(100% + 2rem);
    border-radius: 4px;
  }

  .pin-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: #d4a44c;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .pin-badge svg {
    width: 12px;
    height: 12px;
  }

  .post-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #4a3f32, transparent);
    margin: 0.5rem 0;
  }

  .loading {
    padding: 3rem;
    text-align: center;
    color: #8a7a6a;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 2rem;
    text-align: center;
    color: #8a7a6a;
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state h3 {
    font-size: 1.25rem;
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    margin: 0 0 1.5rem 0;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding-top: 1.5rem;
    margin-top: 1rem;
    border-top: 1px solid #3d3428;
  }

  .page-btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    color: #c4b8a4;
    background: rgba(60, 50, 40, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .page-btn:hover:not(:disabled) {
    background: rgba(60, 50, 40, 0.5);
    border-color: #6b5a48;
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 0.9rem;
    color: #8a7a6a;
  }
</style>
