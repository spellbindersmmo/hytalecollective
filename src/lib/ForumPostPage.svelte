<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase, getStorageUrl } from './supabase.js'

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
  let replyTextarea = $state(null)
  let editTextarea = $state(null)
  let togglingPin = $state(false)
  let showEditPreview = $state(false)

  // Header image editing state
  let editHeaderImage = $state(null)
  let editHeaderImagePreview = $state(null)
  let editHeaderImageInput = $state(null)
  let removeExistingHeader = $state(false)

  // Post reference modal for editing
  let showPostRefModal = $state(false)
  let postRefSearch = $state('')
  let postRefResults = $state([])
  let searchingPosts = $state(false)

  // Header image for guides
  const isGuide = $derived(post?.category?.slug === 'guides')
  const headerImageUrl = $derived(
    post?.header_image ? getStorageUrl('forum-images', post.header_image) : null
  )

  // Formatting functions for reply
  function insertFormat(before, after = before) {
    if (!replyTextarea) return

    const start = replyTextarea.selectionStart
    const end = replyTextarea.selectionEnd
    const selectedText = replyContent.substring(start, end)
    const newText = before + selectedText + after

    replyContent = replyContent.substring(0, start) + newText + replyContent.substring(end)

    setTimeout(() => {
      replyTextarea.focus()
      if (selectedText) {
        replyTextarea.setSelectionRange(start + before.length, end + before.length)
      } else {
        replyTextarea.setSelectionRange(start + before.length, start + before.length)
      }
    }, 0)
  }

  function insertLineFormat(prefix) {
    if (!replyTextarea) return

    const start = replyTextarea.selectionStart
    const beforeSelection = replyContent.substring(0, start)
    const lineStart = beforeSelection.lastIndexOf('\n') + 1

    replyContent = replyContent.substring(0, lineStart) + prefix + replyContent.substring(lineStart)

    setTimeout(() => {
      replyTextarea.focus()
    }, 0)
  }

  function insertLink() {
    if (!replyTextarea) return

    const start = replyTextarea.selectionStart
    const end = replyTextarea.selectionEnd
    const selectedText = replyContent.substring(start, end)

    const linkText = selectedText || 'link text'
    const newText = `[${linkText}](url)`

    replyContent = replyContent.substring(0, start) + newText + replyContent.substring(end)

    setTimeout(() => {
      replyTextarea.focus()
      const urlStart = start + linkText.length + 3
      replyTextarea.setSelectionRange(urlStart, urlStart + 3)
    }, 0)
  }

  // Formatting functions for edit textarea
  function editInsertFormat(before, after = before) {
    if (!editTextarea) return

    const start = editTextarea.selectionStart
    const end = editTextarea.selectionEnd
    const selectedText = editContent.substring(start, end)
    const newText = before + selectedText + after

    editContent = editContent.substring(0, start) + newText + editContent.substring(end)

    setTimeout(() => {
      editTextarea.focus()
      if (selectedText) {
        editTextarea.setSelectionRange(start + before.length, end + before.length)
      } else {
        editTextarea.setSelectionRange(start + before.length, start + before.length)
      }
    }, 0)
  }

  function editInsertLineFormat(prefix) {
    if (!editTextarea) return

    const start = editTextarea.selectionStart
    const end = editTextarea.selectionEnd
    const selectedText = editContent.substring(start, end)
    const beforeSelection = editContent.substring(0, start)
    const lineStart = beforeSelection.lastIndexOf('\n') + 1

    if (selectedText.includes('\n')) {
      const lines = selectedText.split('\n')
      const formatted = lines.map(line => prefix + line).join('\n')
      editContent = editContent.substring(0, start) + formatted + editContent.substring(end)
    } else {
      editContent = editContent.substring(0, lineStart) + prefix + editContent.substring(lineStart)
    }

    setTimeout(() => {
      editTextarea.focus()
    }, 0)
  }

  function editInsertLink() {
    if (!editTextarea) return

    const start = editTextarea.selectionStart
    const end = editTextarea.selectionEnd
    const selectedText = editContent.substring(start, end)

    const linkText = selectedText || 'link text'
    const newText = `[${linkText}](url)`

    editContent = editContent.substring(0, start) + newText + editContent.substring(end)

    setTimeout(() => {
      editTextarea.focus()
      const urlStart = start + linkText.length + 3
      editTextarea.setSelectionRange(urlStart, urlStart + 3)
    }, 0)
  }

  function editInsertHorizontalRule() {
    if (!editTextarea) return

    const start = editTextarea.selectionStart
    const beforeCursor = editContent.substring(0, start)
    const needsNewlineBefore = beforeCursor.length > 0 && !beforeCursor.endsWith('\n')
    const rule = (needsNewlineBefore ? '\n' : '') + '---\n'

    editContent = editContent.substring(0, start) + rule + editContent.substring(start)

    setTimeout(() => {
      editTextarea.focus()
      const newPosition = start + rule.length
      editTextarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  // Post reference search for editing
  let searchTimeout = null
  let searchError = $state(null)

  async function searchPosts(query) {
    if (!query.trim()) {
      postRefResults = []
      searchError = null
      return
    }

    searchingPosts = true
    searchError = null

    try {
      const { data, error: queryError } = await supabase
        .from('forum_posts')
        .select(`
          id, title, slug,
          category:forum_categories(name, color)
        `)
        .ilike('title', `%${query}%`)
        .neq('slug', postSlug) // Exclude current post
        .limit(10)

      if (queryError) {
        console.error('Search error:', queryError)
        searchError = queryError.message
        postRefResults = []
      } else {
        postRefResults = data || []
      }
    } catch (e) {
      console.error('Error searching posts:', e)
      searchError = e.message
      postRefResults = []
    } finally {
      searchingPosts = false
    }
  }

  function handlePostRefSearchInput(e) {
    const query = e.target.value
    postRefSearch = query

    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => searchPosts(query), 300)
  }

  function insertPostReference(refPost) {
    if (!editTextarea) return

    const start = editTextarea.selectionStart
    const refText = `{{ref:${refPost.slug}|${refPost.title}|${refPost.category.name}|${refPost.category.color}}}`

    editContent = editContent.substring(0, start) + refText + editContent.substring(start)

    showPostRefModal = false
    postRefSearch = ''
    postRefResults = []

    setTimeout(() => {
      editTextarea.focus()
      const newPosition = start + refText.length
      editTextarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  function openPostRefModal() {
    showPostRefModal = true
    postRefSearch = ''
    postRefResults = []
  }

  function closePostRefModal() {
    showPostRefModal = false
    postRefSearch = ''
    postRefResults = []
  }

  // Check if current user is the post author
  const isAuthor = $derived(
    auth.isAuthenticated && post && auth.user?.id === post.author?.id
  )

  // Check if this is a news/announcements post (only admins can comment)
  const isNewsCategory = $derived(
    post?.category?.slug === 'news' || post?.category?.slug === 'news-and-announcements'
  )

  // Check if user can reply (not news category, or user is admin)
  const canReply = $derived(
    !isNewsCategory || auth.isAdmin
  )

  // Track previous slug to detect changes
  let prevSlug = $state(postSlug)

  // React to postSlug changes - reload post when navigating to different post
  $effect(() => {
    if (postSlug && postSlug !== prevSlug) {
      prevSlug = postSlug
      // Reset state for new post
      post = null
      replies = []
      editing = false
      showEditPreview = false
      // Scroll to top when navigating to new post
      window.scrollTo(0, 0)
      loadPost()
    }
  })

  onMount(() => {
    loadPost()

    // Handle clicks on post references using event delegation
    function handlePostRefClick(e) {
      const refLink = e.target.closest('[data-post-ref]')
      if (refLink) {
        e.preventDefault()
        e.stopPropagation()
        const refSlug = refLink.getAttribute('data-post-ref')
        if (refSlug) {
          onnavigate(`forum-post-${refSlug}`)
        }
      }
    }

    document.addEventListener('click', handlePostRefClick)
    return () => document.removeEventListener('click', handlePostRefClick)
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

  // Simple markdown renderer
  function renderMarkdown(text) {
    if (!text) return ''

    let html = text
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

      // Code blocks (must be before other formatting)
      .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')

      // Headings
      .replace(/^### (.+)$/gm, '<h4 class="md-h3">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="md-h2">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 class="md-h1">$1</h2>')

      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')

      // Strikethrough and underline
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/\+\+(.+?)\+\+/g, '<u>$1</u>')

      // Horizontal rule
      .replace(/^---$/gm, '<hr class="md-divider" />')

      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

      // Images with size (must be before regular images)
      .replace(/!\[([^\]]*)\]\(([^)#]+)#(small|medium|large)\)/g, '<img src="$2" alt="$1" class="md-image md-image-$3" loading="lazy" decoding="async" />')

      // Images (must be before links since ![alt](url) contains [alt](url))
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image" loading="lazy" decoding="async" />')

      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

      // Blockquotes
      .replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>')

      // Bullet lists
      .replace(/^- (.+)$/gm, '<li class="md-bullet">$1</li>')

      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="md-numbered">$1</li>')

      // Post references - {{ref:slug|title|category|color}}
      .replace(/\{\{ref:([^|]+)\|([^|]+)\|([^|]+)\|([^}]+)\}\}/g, (match, refSlug, title, category, color) => {
        return `<a href="#" class="post-reference" data-post-ref="${refSlug}">
          <span class="post-ref-category" style="background: ${color}20; color: ${color}; border-color: ${color}40;">${category}</span>
          <span class="post-ref-title">${title}</span>
          <span class="post-ref-arrow">→</span>
        </a>`
      })

      // Line breaks
      .replace(/\n/g, '<br />')

    // Wrap consecutive list items
    html = html.replace(/(<li class="md-bullet">.*?<\/li>)(<br \/>)?/g, '$1')
    html = html.replace(/(<li class="md-numbered">.*?<\/li>)(<br \/>)?/g, '$1')

    return html
  }

  // Header image edit handlers
  function handleEditHeaderImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      error = 'Header image must be JPEG, PNG, or WebP'
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      error = 'Header image must be less than 5MB'
      return
    }

    editHeaderImage = file
    editHeaderImagePreview = URL.createObjectURL(file)
    removeExistingHeader = false
    error = null
  }

  function removeEditHeaderImage() {
    editHeaderImage = null
    if (editHeaderImagePreview) {
      URL.revokeObjectURL(editHeaderImagePreview)
      editHeaderImagePreview = null
    }
    if (editHeaderImageInput) editHeaderImageInput.value = ''
    // Mark that we want to remove the existing header
    removeExistingHeader = true
  }

  function keepExistingHeader() {
    removeExistingHeader = false
  }

  async function uploadEditHeaderImage() {
    if (!editHeaderImage) return null

    const ext = editHeaderImage.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const filename = `${auth.user.id}/header-${timestamp}-${randomId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('forum-images')
      .upload(filename, editHeaderImage, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError
    return filename
  }

  // Edit functions
  function startEditing() {
    editTitle = post.title
    editContent = post.content
    editHeaderImage = null
    editHeaderImagePreview = null
    removeExistingHeader = false
    editing = true
  }

  function cancelEditing() {
    editing = false
    editTitle = ''
    editContent = ''
    editHeaderImage = null
    if (editHeaderImagePreview) {
      URL.revokeObjectURL(editHeaderImagePreview)
      editHeaderImagePreview = null
    }
    removeExistingHeader = false
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editContent.trim()) return

    saving = true
    error = null

    try {
      // Handle header image upload/removal for guides
      let headerImagePath = post.header_image // Keep existing by default

      if (editHeaderImage) {
        // Upload new header image
        headerImagePath = await uploadEditHeaderImage()
      } else if (removeExistingHeader) {
        // Remove existing header image
        headerImagePath = null
      }

      const updateData = {
        title: editTitle.trim(),
        content: editContent.trim(),
        updated_at: new Date().toISOString()
      }

      // Only update header_image for guides
      if (isGuide) {
        updateData.header_image = headerImagePath
      }

      const { error: updateError } = await supabase
        .from('forum_posts')
        .update(updateData)
        .eq('id', post.id)

      if (updateError) throw updateError

      // Update local state
      post.title = editTitle.trim()
      post.content = editContent.trim()
      if (isGuide) {
        post.header_image = headerImagePath
      }

      // Clean up preview URL
      if (editHeaderImagePreview) {
        URL.revokeObjectURL(editHeaderImagePreview)
        editHeaderImagePreview = null
      }
      editHeaderImage = null
      removeExistingHeader = false
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

  async function togglePin() {
    if (!auth.isAdmin || togglingPin) return

    togglingPin = true
    error = null

    try {
      const { error: updateError } = await supabase
        .from('forum_posts')
        .update({ is_pinned: !post.is_pinned })
        .eq('id', post.id)

      if (updateError) throw updateError

      // Update local state
      post.is_pinned = !post.is_pinned
    } catch (e) {
      error = e.message
    } finally {
      togglingPin = false
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

        <!-- Guide Header Image -->
        {#if isGuide && headerImageUrl}
          <div class="guide-header">
            <img src={headerImageUrl} alt="" class="guide-header-image" decoding="async" />
            <div class="guide-header-overlay">
              <span class="guide-badge">Guide</span>
              <h1 class="guide-header-title">{post.title}</h1>
              <div class="guide-header-meta">
                <span>By {post.author.username}</span>
                <span class="meta-dot"></span>
                <span>{formatDate(post.created_at)}</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Original Post -->
        <Panel>
          <article class="post">
            <header class="post-header" class:has-header-image={isGuide && headerImageUrl}>
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
                {#if (isAuthor || auth.isAdmin) && !editing}
                  <div class="post-actions">
                    {#if auth.isAdmin}
                      <button
                        class="action-btn pin-btn"
                        class:pinned={post.is_pinned}
                        onclick={togglePin}
                        title={post.is_pinned ? "Unpin post" : "Pin post"}
                        disabled={togglingPin}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 2L12 12" />
                          <path d="M18.5 8.5L12 12L5.5 8.5" />
                          <path d="M12 12L12 22" />
                          <circle cx="12" cy="5" r="3" />
                        </svg>
                        {togglingPin ? '...' : post.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    {/if}
                    {#if isAuthor}
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
                    {/if}
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
              {:else if !(isGuide && headerImageUrl)}
                <h1 class="post-title">{post.title}</h1>
              {/if}
            </header>

            <div class="post-body">
              <aside class="author-card">
                <div class="avatar">
                  {#if post.author.avatar_url?.startsWith('http')}
                    <img src={post.author.avatar_url} alt="" decoding="async" />
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
                    <!-- Header Image for Guides -->
                    {#if isGuide}
                      <div class="edit-header-image-section">
                        <label>Header Image <span class="optional">(optional)</span></label>

                        {#if editHeaderImagePreview}
                          <!-- New image preview -->
                          <div class="header-image-preview">
                            <img src={editHeaderImagePreview} alt="Header preview" />
                            <div class="header-image-overlay">
                              <span class="preview-title">{editTitle || 'Your Guide Title'}</span>
                            </div>
                            <button type="button" class="remove-header-btn" onclick={removeEditHeaderImage}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        {:else if headerImageUrl && !removeExistingHeader}
                          <!-- Existing image -->
                          <div class="header-image-preview">
                            <img src={headerImageUrl} alt="Current header" />
                            <div class="header-image-overlay">
                              <span class="preview-title">{editTitle || post.title}</span>
                            </div>
                            <button type="button" class="remove-header-btn" onclick={removeEditHeaderImage} title="Remove header image">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                            <button type="button" class="change-header-btn" onclick={() => editHeaderImageInput?.click()} title="Change header image">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          </div>
                        {:else}
                          <!-- No image / Upload button -->
                          <button
                            type="button"
                            class="header-image-upload"
                            onclick={() => editHeaderImageInput?.click()}
                            disabled={saving}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <span>Click to add header image</span>
                            <small>Recommended: 1200x400px, max 5MB</small>
                          </button>
                        {/if}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          class="hidden-file-input"
                          bind:this={editHeaderImageInput}
                          onchange={handleEditHeaderImageSelect}
                        />
                      </div>
                    {/if}

                    <!-- Formatting Toolbar -->
                    <div class="editor-toolbar">
                      <div class="toolbar-group">
                        <button type="button" class="toolbar-btn" title="Bold" onclick={() => editInsertFormat('**')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                          </svg>
                        </button>
                        <button type="button" class="toolbar-btn" title="Italic" onclick={() => editInsertFormat('*')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="19" y1="4" x2="10" y2="4" />
                            <line x1="14" y1="20" x2="5" y2="20" />
                            <line x1="15" y1="4" x2="9" y2="20" />
                          </svg>
                        </button>
                        <button type="button" class="toolbar-btn" title="Strikethrough" onclick={() => editInsertFormat('~~')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2m8.2 0c1.1.5 1.6 1.8 1.6 3.1 0 3.6-3.3 4.5-6.8 4.5-1.3 0-2.6-.1-3.9-.3" />
                            <line x1="4" y1="12" x2="20" y2="12" />
                          </svg>
                        </button>
                        <button type="button" class="toolbar-btn" title="Underline" onclick={() => editInsertFormat('++')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
                            <line x1="4" y1="21" x2="20" y2="21" />
                          </svg>
                        </button>
                      </div>

                      <div class="toolbar-divider"></div>

                      <div class="toolbar-group">
                        <button type="button" class="toolbar-btn" title="Heading 1" onclick={() => editInsertLineFormat('# ')}>
                          <span class="toolbar-text">H1</span>
                        </button>
                        <button type="button" class="toolbar-btn" title="Heading 2" onclick={() => editInsertLineFormat('## ')}>
                          <span class="toolbar-text">H2</span>
                        </button>
                        <button type="button" class="toolbar-btn" title="Heading 3" onclick={() => editInsertLineFormat('### ')}>
                          <span class="toolbar-text">H3</span>
                        </button>
                      </div>

                      <div class="toolbar-divider"></div>

                      <div class="toolbar-group">
                        <button type="button" class="toolbar-btn" title="Bullet List" onclick={() => editInsertLineFormat('- ')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="9" y1="6" x2="20" y2="6" />
                            <line x1="9" y1="12" x2="20" y2="12" />
                            <line x1="9" y1="18" x2="20" y2="18" />
                            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
                          </svg>
                        </button>
                        <button type="button" class="toolbar-btn" title="Numbered List" onclick={() => editInsertLineFormat('1. ')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="10" y1="6" x2="21" y2="6" />
                            <line x1="10" y1="12" x2="21" y2="12" />
                            <line x1="10" y1="18" x2="21" y2="18" />
                            <text x="3" y="8" font-size="6" fill="currentColor" font-family="sans-serif">1</text>
                            <text x="3" y="14" font-size="6" fill="currentColor" font-family="sans-serif">2</text>
                            <text x="3" y="20" font-size="6" fill="currentColor" font-family="sans-serif">3</text>
                          </svg>
                        </button>
                      </div>

                      <div class="toolbar-divider"></div>

                      <div class="toolbar-group">
                        <button type="button" class="toolbar-btn" title="Insert Link" onclick={editInsertLink}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                        </button>
                        <button type="button" class="toolbar-btn" title="Reference Another Post" onclick={openPostRefModal}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                        </button>
                        <button type="button" class="toolbar-btn" title="Quote" onclick={() => editInsertLineFormat('> ')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
                            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
                          </svg>
                        </button>
                        <button type="button" class="toolbar-btn" title="Code Block" onclick={() => editInsertFormat('```\n', '\n```')}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                          </svg>
                        </button>
                        <button type="button" class="toolbar-btn" title="Horizontal Line" onclick={editInsertHorizontalRule}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12" />
                          </svg>
                        </button>
                      </div>

                      <div class="toolbar-spacer"></div>

                      <button
                        type="button"
                        class="preview-toggle"
                        class:active={showEditPreview}
                        onclick={() => showEditPreview = !showEditPreview}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {showEditPreview ? 'Edit' : 'Preview'}
                      </button>
                    </div>

                    {#if showEditPreview}
                      <div class="preview-pane">
                        <div class="preview-content markdown-content">
                          {@html renderMarkdown(editContent)}
                        </div>
                      </div>
                    {:else}
                      <textarea
                        class="edit-content-input"
                        bind:value={editContent}
                        bind:this={editTextarea}
                        placeholder="Post content... Supports Markdown formatting."
                        rows="12"
                      ></textarea>
                    {/if}

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
                  <div class="content markdown-content">
                    {@html renderMarkdown(post.content)}
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
                      {#if reply.author.avatar_url?.startsWith('http')}
                        <img src={reply.author.avatar_url} alt="" loading="lazy" decoding="async" />
                      {:else}
                        <span>{reply.author.username.charAt(0).toUpperCase()}</span>
                      {/if}
                    </div>
                    <div class="author-name">{reply.author.username}</div>
                  </aside>

                  <div class="content-area">
                    <div class="content markdown-content">
                      {@html renderMarkdown(reply.content)}
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
        {#if !post.is_locked && canReply}
          <section class="reply-form-section">
            <h2 class="form-title">Leave a Reply</h2>

            {#if auth.isAuthenticated}
              <Panel>
                <form class="reply-form" onsubmit={(e) => { e.preventDefault(); submitReply(); }}>
                  <!-- Formatting Toolbar -->
                  <div class="editor-toolbar">
                    <button type="button" class="toolbar-btn" title="Bold" onclick={() => insertFormat('**')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                      </svg>
                    </button>
                    <button type="button" class="toolbar-btn" title="Italic" onclick={() => insertFormat('*')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="4" x2="10" y2="4" />
                        <line x1="14" y1="20" x2="5" y2="20" />
                        <line x1="15" y1="4" x2="9" y2="20" />
                      </svg>
                    </button>
                    <button type="button" class="toolbar-btn" title="Link" onclick={insertLink}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </button>
                    <button type="button" class="toolbar-btn" title="Bullet List" onclick={() => insertLineFormat('- ')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="9" y1="6" x2="20" y2="6" />
                        <line x1="9" y1="12" x2="20" y2="12" />
                        <line x1="9" y1="18" x2="20" y2="18" />
                        <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                        <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                        <circle cx="4" cy="18" r="1.5" fill="currentColor" />
                      </svg>
                    </button>
                    <button type="button" class="toolbar-btn" title="Quote" onclick={() => insertLineFormat('> ')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
                      </svg>
                    </button>
                    <button type="button" class="toolbar-btn" title="Code" onclick={() => insertFormat('`')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </button>
                  </div>

                  <textarea
                    bind:value={replyContent}
                    bind:this={replyTextarea}
                    placeholder="Write your reply... Supports Markdown formatting."
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
        {:else if post.is_locked}
          <Panel>
            <div class="locked-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p>This post has been locked and no longer accepts new replies.</p>
            </div>
          </Panel>
        {:else if isNewsCategory && !auth.isAdmin}
          <Panel>
            <div class="locked-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <p>Only administrators can comment on news and announcements.</p>
            </div>
          </Panel>
        {/if}
      {/if}
    </div>
  </main>

  <Footer {onnavigate} />
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

<!-- Post Reference Modal -->
{#if showPostRefModal}
  <div class="modal-overlay" onclick={closePostRefModal}>
    <div class="post-ref-modal" onclick={(e) => e.stopPropagation()}>
      <div class="post-ref-modal-header">
        <h3>Reference Another Post</h3>
        <p>Search for a post to link to</p>
      </div>

      <div class="post-ref-search-container">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          class="post-ref-search-input"
          placeholder="Search posts by title..."
          value={postRefSearch}
          oninput={handlePostRefSearchInput}
        />
        {#if searchingPosts}
          <div class="search-spinner"></div>
        {/if}
      </div>

      <div class="post-ref-results">
        {#if searchError}
          <div class="search-error">
            <p>Error searching: {searchError}</p>
          </div>
        {:else if postRefResults.length > 0}
          {#each postRefResults as refPost}
            {#if refPost.category}
              <button class="post-ref-result" onclick={() => insertPostReference(refPost)}>
                <span
                  class="result-category"
                  style="background: {refPost.category.color}20; color: {refPost.category.color}; border-color: {refPost.category.color}40;"
                >
                  {refPost.category.name}
                </span>
                <span class="result-title">{refPost.title}</span>
              </button>
            {/if}
          {/each}
        {:else if postRefSearch && !searchingPosts}
          <div class="no-results">
            <p>No posts found matching "{postRefSearch}"</p>
          </div>
        {:else if !postRefSearch}
          <div class="search-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p>Start typing to search for posts</p>
          </div>
        {/if}
      </div>

      <div class="post-ref-modal-footer">
        <button type="button" class="post-ref-cancel" onclick={closePostRefModal}>Cancel</button>
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

  .action-btn.pin-btn.pinned {
    background: rgba(212, 164, 76, 0.15);
    border-color: #d4a44c;
    color: #d4a44c;
  }

  .action-btn.pin-btn:hover {
    border-color: #d4a44c;
    color: #e8c36b;
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

  /* Header image editing styles */
  .edit-header-image-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .edit-header-image-section label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #c4b8a4;
  }

  .edit-header-image-section .optional {
    font-weight: 400;
    color: #8a7f6d;
    font-size: 0.8rem;
  }

  .header-image-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 21 / 9;
    max-height: 200px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #4a3f32;
  }

  .header-image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .header-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 60%);
    display: flex;
    align-items: flex-end;
    padding: 1rem;
  }

  .header-image-overlay .preview-title {
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  }

  .remove-header-btn,
  .change-header-btn {
    position: absolute;
    top: 0.5rem;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .remove-header-btn {
    right: 0.5rem;
  }

  .change-header-btn {
    right: 3rem;
  }

  .remove-header-btn:hover {
    background: rgba(196, 107, 107, 0.9);
  }

  .change-header-btn:hover {
    background: rgba(212, 164, 76, 0.9);
  }

  .remove-header-btn svg,
  .change-header-btn svg {
    width: 16px;
    height: 16px;
  }

  .header-image-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    background: rgba(0, 0, 0, 0.2);
    border: 2px dashed #4a3f32;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    color: #8a7f6d;
  }

  .header-image-upload:hover {
    border-color: #d4a44c;
    background: rgba(212, 164, 76, 0.05);
    color: #c4b8a4;
  }

  .header-image-upload:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .header-image-upload svg {
    width: 32px;
    height: 32px;
  }

  .header-image-upload span {
    font-size: 0.9rem;
  }

  .header-image-upload small {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .hidden-file-input {
    display: none;
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
    word-wrap: break-word;
    /* Performance: Contain content rendering */
    contain: layout style;
  }

  /* Markdown Styles */
  .markdown-content :global(h2.md-h1) {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 1rem 0 0.5rem 0;
  }

  .markdown-content :global(h3.md-h2) {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f0e6d8;
    margin: 1rem 0 0.5rem 0;
  }

  .markdown-content :global(h4.md-h3) {
    font-size: 1.1rem;
    font-weight: 600;
    color: #e0d6c8;
    margin: 0.75rem 0 0.35rem 0;
  }

  .markdown-content :global(strong) {
    font-weight: 700;
    color: #f0e6d8;
  }

  .markdown-content :global(em) {
    font-style: italic;
  }

  .markdown-content :global(del) {
    text-decoration: line-through;
    opacity: 0.7;
  }

  .markdown-content :global(a) {
    color: #6bb8cc;
    text-decoration: none;
  }

  .markdown-content :global(a:hover) {
    text-decoration: underline;
  }

  .markdown-content :global(.md-image) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 0.5rem 0;
    border: 1px solid #3d3428;
    /* Performance: Isolate image rendering */
    contain: layout style paint;
    content-visibility: auto;
  }

  .markdown-content :global(.md-image-small) {
    max-width: 25%;
  }

  .markdown-content :global(.md-image-medium) {
    max-width: 50%;
  }

  .markdown-content :global(.md-image-large) {
    max-width: 75%;
  }

  .markdown-content :global(.code-block) {
    display: block;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #3d3428;
    border-radius: 4px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.85rem;
    color: #d4d4d4;
    overflow-x: auto;
    white-space: pre;
  }

  .markdown-content :global(.inline-code) {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #3d3428;
    border-radius: 3px;
    padding: 0.1rem 0.4rem;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.85em;
    color: #e8c36b;
  }

  .markdown-content :global(.md-quote) {
    border-left: 3px solid #d4a44c;
    padding-left: 1rem;
    margin: 0.5rem 0;
    color: #a89880;
    font-style: italic;
  }

  .markdown-content :global(li.md-bullet),
  .markdown-content :global(li.md-numbered) {
    display: list-item;
    margin-left: 1.5rem;
    padding: 0.1rem 0;
  }

  .markdown-content :global(li.md-bullet) {
    list-style-type: disc;
  }

  .markdown-content :global(li.md-numbered) {
    list-style-type: decimal;
  }

  .markdown-content :global(u) {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .markdown-content :global(.md-divider) {
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, #4a3f32 20%, #4a3f32 80%, transparent);
    margin: 1.5rem 0;
  }

  /* Post Reference Card Styles */
  .markdown-content :global(.post-reference) {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: linear-gradient(180deg, rgba(42, 36, 28, 0.8) 0%, rgba(30, 26, 21, 0.8) 100%);
    border: 1px solid #4a3f32;
    border-radius: 8px;
    margin: 0.75rem 0;
    text-decoration: none;
    transition: all 0.15s;
    cursor: pointer;
  }

  .markdown-content :global(.post-reference:hover) {
    border-color: #d4a44c;
    background: linear-gradient(180deg, rgba(50, 43, 33, 0.9) 0%, rgba(35, 30, 24, 0.9) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .markdown-content :global(.post-ref-category) {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .markdown-content :global(.post-ref-title) {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 500;
    color: #f0e6d8;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .markdown-content :global(.post-ref-arrow) {
    color: #d4a44c;
    font-size: 1.1rem;
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  .markdown-content :global(.post-reference:hover .post-ref-arrow) {
    transform: translateX(3px);
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

  /* Performance: Skip rendering off-screen replies */
  .replies-section > :global(*) {
    content-visibility: auto;
    contain-intrinsic-size: auto 200px;
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
    gap: 0;
  }

  /* Editor Toolbar */
  .editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #4a3f32;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #a89880;
    cursor: pointer;
    transition: all 0.15s;
  }

  .toolbar-btn:hover {
    background: rgba(212, 164, 76, 0.15);
    border-color: #4a3f32;
    color: #d4a44c;
  }

  .toolbar-btn:active {
    background: rgba(212, 164, 76, 0.25);
  }

  .toolbar-btn svg {
    width: 18px;
    height: 18px;
  }

  .reply-form textarea {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .form-actions {
    margin-top: 1rem;
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

  /* Guide Header */
  .guide-header {
    position: relative;
    width: 100%;
    aspect-ratio: 21 / 9;
    max-height: 400px;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }

  .guide-header-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
  }

  .guide-header-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.85) 0%,
      rgba(0, 0, 0, 0.4) 50%,
      rgba(0, 0, 0, 0.2) 100%
    );
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 1.5rem 2rem;
  }

  .guide-badge {
    display: inline-block;
    width: fit-content;
    padding: 0.3rem 0.75rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: linear-gradient(180deg, #d4a44c 0%, #a67c28 100%);
    color: #1a1208;
    border-radius: 4px;
    margin-bottom: 0.75rem;
  }

  .guide-header-title {
    font-family: 'Cinzel', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.75rem 0;
    line-height: 1.2;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .guide-header-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .meta-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
  }

  .post-header.has-header-image {
    padding-top: 0;
  }

  .post-header.has-header-image .post-title {
    display: none;
  }

  @media (max-width: 640px) {
    .guide-header {
      aspect-ratio: 16 / 9;
      max-height: 280px;
      border-radius: 8px;
    }

    .guide-header-overlay {
      padding: 1rem 1.25rem;
    }

    .guide-header-title {
      font-size: 1.4rem;
    }

    .guide-header-meta {
      font-size: 0.75rem;
    }
  }

  /* Edit form toolbar additions */
  .toolbar-group {
    display: flex;
    gap: 0.125rem;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background: #4a3f32;
    margin: 0 0.375rem;
  }

  .toolbar-text {
    font-size: 0.75rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .preview-toggle {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    background: transparent;
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #a89880;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preview-toggle:hover {
    background: rgba(212, 164, 76, 0.15);
    border-color: #6b5a48;
    color: #d4a44c;
  }

  .preview-toggle.active {
    background: rgba(212, 164, 76, 0.2);
    border-color: #d4a44c;
    color: #d4a44c;
  }

  .preview-toggle svg {
    width: 16px;
    height: 16px;
  }

  .preview-pane {
    min-height: 250px;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-top: none;
    border-radius: 0 0 6px 6px;
  }

  .preview-content {
    color: #c4b8a4;
    line-height: 1.7;
  }

  .edit-content-input {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  @media (max-width: 640px) {
    .toolbar-divider {
      display: none;
    }

    .toolbar-spacer {
      display: none;
    }

    .preview-toggle {
      margin-left: 0.25rem;
    }
  }

  /* Post Reference Modal */
  .post-ref-modal {
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #4a3f32;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .post-ref-modal-header {
    margin-bottom: 1.25rem;
  }

  .post-ref-modal-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0 0 0.25rem 0;
  }

  .post-ref-modal-header p {
    font-size: 0.85rem;
    color: #8a7a6a;
    margin: 0;
  }

  .post-ref-search-container {
    position: relative;
    margin-bottom: 1rem;
  }

  .post-ref-search-container .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: #6b5a48;
    pointer-events: none;
  }

  .post-ref-search-input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 2.75rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: #f0e6d8;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 8px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .post-ref-search-input:focus {
    outline: none;
    border-color: #d4a44c;
    box-shadow: 0 0 0 3px rgba(212, 164, 76, 0.15);
  }

  .post-ref-search-input::placeholder {
    color: #6b5a48;
  }

  .search-spinner {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border: 2px solid #4a3f32;
    border-top-color: #d4a44c;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: translateY(-50%) rotate(360deg); }
  }

  .post-ref-results {
    flex: 1;
    overflow-y: auto;
    min-height: 200px;
    max-height: 300px;
    margin-bottom: 1rem;
  }

  .post-ref-result {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid #3d3428;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }

  .post-ref-result:hover {
    background: rgba(212, 164, 76, 0.1);
    border-color: #d4a44c;
  }

  .result-category {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid;
    border-radius: 3px;
  }

  .result-title {
    font-size: 0.95rem;
    font-weight: 500;
    color: #f0e6d8;
    line-height: 1.4;
  }

  .no-results, .search-hint, .search-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    color: #6b5a48;
  }

  .search-error {
    color: #e8a0a0;
    background: rgba(196, 107, 107, 0.1);
    border-radius: 8px;
  }

  .search-hint svg {
    width: 32px;
    height: 32px;
    opacity: 0.5;
  }

  .no-results p, .search-hint p {
    margin: 0;
    font-size: 0.9rem;
  }

  .post-ref-modal-footer {
    display: flex;
    justify-content: flex-end;
  }

  .post-ref-cancel {
    padding: 0.625rem 1.25rem;
    background: transparent;
    border: 1px solid #4a3f32;
    border-radius: 6px;
    color: #a89880;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .post-ref-cancel:hover {
    background: rgba(0, 0, 0, 0.3);
    border-color: #6b5a48;
    color: #c4b8a4;
  }
</style>
