<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase } from './supabase.js'

  let { postSlug = '', onnavigate = () => {} } = $props()

  let post = $state(null)
  let replies = $state([])
  let loading = $state(true)
  let replyContent = $state('')
  let submitting = $state(false)
  let error = $state(null)

  // Edit/Delete state
  let editing = $state(false)
  let editTitle = $state('')
  let editContent = $state('')
  let saving = $state(false)
  let showDeleteConfirm = $state(false)
  let deleting = $state(false)

  // Check if current user is the post author
  const isAuthor = $derived(
    auth.isAuthenticated && post && auth.user?.id === post.author?.id
  )

  onMount(() => {
    loadPost()
  })

  async function loadPost() {
    loading = true
    try {
      const { data, error: postError } = await supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(id, username, avatar_url, created_at),
          category:forum_categories(id, name, slug, color)
        `)
        .eq('slug', postSlug)
        .single()

      if (postError) throw postError
      post = data

      // Increment view count
      await supabase
        .from('forum_posts')
        .update({ view_count: data.view_count + 1 })
        .eq('id', data.id)

      // Load replies
      await loadReplies()
    } catch (e) {
      console.error('Error loading post:', e)
    } finally {
      loading = false
    }
  }

  async function loadReplies() {
    const { data, error } = await supabase
      .from('forum_replies')
      .select(`
        *,
        author:profiles(id, username, avatar_url, created_at)
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })

    if (!error) {
      replies = data
    }
  }

  async function submitReply() {
    if (!replyContent.trim() || !auth.isAuthenticated) return

    submitting = true
    error = null

    try {
      const { error: replyError } = await supabase
        .from('forum_replies')
        .insert({
          post_id: post.id,
          author_id: auth.user.id,
          content: replyContent.trim()
        })

      if (replyError) throw replyError

      replyContent = ''
      await loadReplies()

      // Update local reply count
      post.reply_count = (post.reply_count || 0) + 1
    } catch (e) {
      error = e.message
    } finally {
      submitting = false
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatMemberSince(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  // Edit functions
  function startEditing() {
    editTitle = post.title
    editContent = post.content
    editing = true
  }

  function cancelEditing() {
    editing = false
    editTitle = ''
    editContent = ''
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editContent.trim()) return

    saving = true
    error = null

    try {
      const { error: updateError } = await supabase
        .from('forum_posts')
        .update({
          title: editTitle.trim(),
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id)

      if (updateError) throw updateError

      // Update local state
      post.title = editTitle.trim()
      post.content = editContent.trim()
      editing = false
    } catch (e) {
      error = e.message
    } finally {
      saving = false
    }
  }

  // Delete functions
  function confirmDelete() {
    showDeleteConfirm = true
  }

  function cancelDelete() {
    showDeleteConfirm = false
  }

  async function deletePost() {
    deleting = true
    error = null

    try {
      const { error: deleteError } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', post.id)

      if (deleteError) throw deleteError

      // Navigate back to the category
      onnavigate(`forum-category-${post.category.slug}`)
    } catch (e) {
      error = e.message
      showDeleteConfirm = false
    } finally {
      deleting = false
    }
  }
</script>

<div class="page">
  <Navbar currentPage="forum" {onnavigate} />

  <main class="main">
    <div class="container">
      {#if loading}
        <div class="loading">Loading post...</div>
      {:else if !post}
        <Panel>
          <div class="not-found">
            <h2>Post Not Found</h2>
            <p>The post you're looking for doesn't exist or has been removed.</p>
            <Button variant="secondary" onclick={() => onnavigate('forum')}>
              Back to Forum
            </Button>
          </div>
        </Panel>
      {:else}
        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <button onclick={() => onnavigate('forum')}>Forum</button>
          <span class="separator">/</span>
          <button onclick={() => onnavigate(`forum-category-${post.category.slug}`)}>
            {post.category.name}
          </button>
          <span class="separator">/</span>
          <span class="current">Post</span>
        </nav>

        <!-- Original Post -->
        <Panel>
          <article class="post">
            <header class="post-header">
              <div class="post-header-top">
                <div class="post-meta">
                  <span
                    class="category-badge"
                    style="background: {post.category.color}20; color: {post.category.color}; border-color: {post.category.color}40;"
                  >
                    {post.category.name}
                  </span>
                  {#if post.is_pinned}
                    <span class="pinned-badge">Pinned</span>
                  {/if}
                  {#if post.is_locked}
                    <span class="locked-badge">Locked</span>
                  {/if}
                </div>
                {#if isAuthor && !editing}
                  <div class="post-actions">
                    <button class="action-btn edit-btn" onclick={startEditing} title="Edit post">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>
                    <button class="action-btn delete-btn" onclick={confirmDelete} title="Delete post">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                {/if}
              </div>
              {#if editing}
                <input
                  type="text"
                  class="edit-title-input"
                  bind:value={editTitle}
                  placeholder="Post title"
                />
              {:else}
                <h1 class="post-title">{post.title}</h1>
              {/if}
            </header>

            <div class="post-body">
              <aside class="author-card">
                <div class="avatar">
                  {#if post.author.avatar_url}
                    <img src={post.author.avatar_url} alt="" />
                  {:else}
                    <span>{post.author.username.charAt(0).toUpperCase()}</span>
                  {/if}
                </div>
                <div class="author-name">{post.author.username}</div>
                <div class="author-info">
                  Member since {formatMemberSince(post.author.created_at)}
                </div>
              </aside>

              <div class="content-area">
                {#if editing}
                  <div class="edit-form">
                    <textarea
                      class="edit-content-input"
                      bind:value={editContent}
                      placeholder="Post content"
                      rows="8"
                    ></textarea>
                    {#if error}
                      <div class="error-message">{error}</div>
                    {/if}
                    <div class="edit-actions">
                      <Button variant="secondary" onclick={cancelEditing} disabled={saving}>
                        Cancel
                      </Button>
                      <Button variant="primary" onclick={saveEdit} disabled={saving || !editTitle.trim() || !editContent.trim()}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                {:else}
                  <div class="content">
                    {post.content}
                  </div>
                  <footer class="post-footer">
                    <span class="timestamp">{formatDate(post.created_at)}</span>
                    <div class="stats">
                      <span>{post.view_count} views</span>
                      <span>{post.reply_count} replies</span>
                    </div>
                  </footer>
                {/if}
              </div>
            </div>
          </article>
        </Panel>

        <!-- Replies -->
        {#if replies.length > 0}
          <section class="replies-section">
            <h2 class="replies-title">{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</h2>

            {#each replies as reply, i}
              <Panel>
                <div class="reply">
                  <aside class="author-card compact">
                    <div class="avatar small">
                      {#if reply.author.avatar_url}
                        <img src={reply.author.avatar_url} alt="" />
                      {:else}
                        <span>{reply.author.username.charAt(0).toUpperCase()}</span>
                      {/if}
                    </div>
                    <div class="author-name">{reply.author.username}</div>
                  </aside>

                  <div class="content-area">
                    <div class="content">
                      {reply.content}
                    </div>
                    <footer class="post-footer">
                      <span class="timestamp">{formatDate(reply.created_at)}</span>
                      {#if reply.is_solution}
                        <span class="solution-badge">Solution</span>
                      {/if}
                    </footer>
                  </div>
                </div>
              </Panel>
            {/each}
          </section>
        {/if}

        <!-- Reply Form -->
        {#if !post.is_locked}
          <section class="reply-form-section">
            <h2 class="form-title">Leave a Reply</h2>

            {#if auth.isAuthenticated}
              <Panel>
                <form class="reply-form" onsubmit={(e) => { e.preventDefault(); submitReply(); }}>
                  <textarea
                    bind:value={replyContent}
                    placeholder="Write your reply..."
                    rows="4"
                    disabled={submitting}
                    required
                  ></textarea>

                  {#if error}
                    <div class="error-message">{error}</div>
                  {/if}

                  <div class="form-actions">
                    <Button variant="primary" type="submit" disabled={submitting || !replyContent.trim()}>
                      {submitting ? 'Posting...' : 'Post Reply'}
                    </Button>
                  </div>
                </form>
              </Panel>
            {:else}
              <Panel>
                <div class="login-prompt">
                  <p>You must be logged in to reply to this post.</p>
                </div>
              </Panel>
            {/if}
          </section>
        {:else}
          <Panel>
            <div class="locked-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p>This post has been locked and no longer accepts new replies.</p>
            </div>
          </Panel>
        {/if}
      {/if}
    </div>
  </main>

  <Footer />
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="modal-overlay" onclick={cancelDelete}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3>Delete Post</h3>
      </div>
      <p>Are you sure you want to delete this post? This action cannot be undone and will also delete all replies.</p>
      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      <div class="modal-actions">
        <Button variant="secondary" onclick={cancelDelete} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="primary" onclick={deletePost} disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete Post'}
        </Button>
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
    max-width: 56rem;
    margin: 0 auto;
  }

  .loading, .not-found {
    padding: 3rem;
    text-align: center;
    color: #8a7a6a;
  }

  .not-found h2 {
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  .not-found p {
    margin: 0 0 1.5rem 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    flex-wrap: wrap;
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

  /* Post */
  .post-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #3d3428;
  }

  .post-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .post-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .post-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    border: 1px solid #4a3f32;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    color: #c4b8a4;
  }

  .action-btn:hover {
    border-color: #6b5a48;
    color: #f0e6d8;
  }

  .action-btn svg {
    width: 14px;
    height: 14px;
  }

  .action-btn.delete-btn:hover {
    border-color: #c46b6b;
    color: #e8a0a0;
  }

  .edit-title-input {
    width: 100%;
    padding: 0.75rem;
    font-family: 'Cinzel', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    margin-top: 0.5rem;
  }

  .edit-title-input:focus {
    outline: none;
    border-color: #d4a44c;
    box-shadow: 0 0 0 3px rgba(212, 164, 76, 0.15);
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .edit-content-input {
    width: 100%;
    padding: 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: #f0e6d8;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    resize: vertical;
    min-height: 150px;
    line-height: 1.7;
  }

  .edit-content-input:focus {
    outline: none;
    border-color: #d4a44c;
    box-shadow: 0 0 0 3px rgba(212, 164, 76, 0.15);
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .category-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid;
    border-radius: 3px;
  }

  .pinned-badge, .locked-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 3px;
  }

  .pinned-badge {
    background: rgba(212, 164, 76, 0.15);
    color: #d4a44c;
  }

  .locked-badge {
    background: rgba(196, 107, 107, 0.15);
    color: #c46b6b;
  }

  .post-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
    line-height: 1.3;
  }

  .post-body, .reply {
    display: flex;
    gap: 1.5rem;
  }

  @media (max-width: 640px) {
    .post-body, .reply {
      flex-direction: column;
      gap: 1rem;
    }
  }

  .author-card {
    flex-shrink: 0;
    width: 120px;
    text-align: center;
  }

  .author-card.compact {
    width: 80px;
  }

  @media (max-width: 640px) {
    .author-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      text-align: left;
    }
  }

  .avatar {
    width: 64px;
    height: 64px;
    margin: 0 auto 0.75rem;
    border-radius: 8px;
    background: linear-gradient(180deg, #d4a44c 0%, #a67c28 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .avatar.small {
    width: 40px;
    height: 40px;
    border-radius: 6px;
  }

  @media (max-width: 640px) {
    .avatar {
      margin: 0;
      width: 48px;
      height: 48px;
    }
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar span {
    font-family: 'Cinzel', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1208;
  }

  .avatar.small span {
    font-size: 1rem;
  }

  .author-name {
    font-weight: 600;
    color: #f0e6d8;
    font-size: 0.9rem;
  }

  .author-info {
    font-size: 0.75rem;
    color: #8a7a6a;
    margin-top: 0.25rem;
  }

  .content-area {
    flex: 1;
    min-width: 0;
  }

  .content {
    color: #c4b8a4;
    line-height: 1.7;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .post-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #3d3428;
    font-size: 0.8rem;
    color: #6b5a48;
  }

  .stats {
    display: flex;
    gap: 1rem;
  }

  .solution-badge {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(126, 196, 123, 0.15);
    color: #7ec47b;
    border-radius: 3px;
  }

  /* Replies Section */
  .replies-section {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .replies-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  /* Reply Form */
  .reply-form-section {
    margin-top: 2rem;
  }

  .form-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #c4b8a4;
    margin: 0 0 1rem 0;
  }

  .reply-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  textarea {
    width: 100%;
    padding: 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: #f0e6d8;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    resize: vertical;
    min-height: 120px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  textarea:focus {
    outline: none;
    border-color: #d4a44c;
    box-shadow: 0 0 0 3px rgba(212, 164, 76, 0.15);
  }

  textarea::placeholder {
    color: #6b5a48;
  }

  textarea:disabled {
    opacity: 0.6;
  }

  .error-message {
    padding: 0.75rem 1rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid #c46b6b;
    border-radius: 6px;
    color: #e8a0a0;
    font-size: 0.85rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .login-prompt {
    padding: 1.5rem;
    text-align: center;
    color: #8a7a6a;
  }

  .login-prompt p {
    margin: 0;
  }

  .locked-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.5rem;
    color: #8a7a6a;
  }

  .locked-notice svg {
    width: 24px;
    height: 24px;
    opacity: 0.6;
  }

  .locked-notice p {
    margin: 0;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background: linear-gradient(180deg, #2a241c 0%, #1e1a14 100%);
    border: 1px solid #4a3f32;
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .modal-header svg {
    width: 24px;
    height: 24px;
    color: #c46b6b;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #f5d898;
  }

  .modal p {
    color: #a89880;
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0 0 1.25rem 0;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
</style>
