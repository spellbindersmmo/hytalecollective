<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import AuthModal from './AuthModal.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase } from './supabase.js'
  import { generateUniqueSlug } from './utils.js'

  let { categorySlug = '', onnavigate = () => {} } = $props()

  let allCategories = $state([])
  let selectedCategory = $state('')
  let title = $state('')
  let content = $state('')
  let loading = $state(true)
  let submitting = $state(false)
  let error = $state(null)
  let showAuthModal = $state(false)
  let contentTextarea = $state(null)
  let showPreview = $state(false)

  // Markdown renderer
  function renderMarkdown(text) {
    if (!text) return '<span class="empty-preview">Preview will appear here...</span>'

    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>')
      .replace(/^### (.+)$/gm, '<h4 class="md-h3">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="md-h2">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 class="md-h1">$1</h2>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-image" />')
      .replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li class="md-bullet">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="md-numbered">$1</li>')
      .replace(/\n/g, '<br />')

    return html
  }

  // Formatting functions
  function insertFormat(before, after = before) {
    if (!contentTextarea) return

    const start = contentTextarea.selectionStart
    const end = contentTextarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newText = before + selectedText + after

    content = content.substring(0, start) + newText + content.substring(end)

    // Set cursor position after formatting
    setTimeout(() => {
      contentTextarea.focus()
      if (selectedText) {
        contentTextarea.setSelectionRange(start + before.length, end + before.length)
      } else {
        contentTextarea.setSelectionRange(start + before.length, start + before.length)
      }
    }, 0)
  }

  function insertLineFormat(prefix) {
    if (!contentTextarea) return

    const start = contentTextarea.selectionStart
    const end = contentTextarea.selectionEnd
    const selectedText = content.substring(start, end)

    // Find line start
    const beforeSelection = content.substring(0, start)
    const lineStart = beforeSelection.lastIndexOf('\n') + 1

    if (selectedText.includes('\n')) {
      // Multi-line: add prefix to each line
      const lines = selectedText.split('\n')
      const formatted = lines.map(line => prefix + line).join('\n')
      content = content.substring(0, start) + formatted + content.substring(end)
    } else {
      // Single line: add prefix at line start
      content = content.substring(0, lineStart) + prefix + content.substring(lineStart)
    }

    setTimeout(() => {
      contentTextarea.focus()
    }, 0)
  }

  function insertLink() {
    if (!contentTextarea) return

    const start = contentTextarea.selectionStart
    const end = contentTextarea.selectionEnd
    const selectedText = content.substring(start, end)

    const linkText = selectedText || 'link text'
    const newText = `[${linkText}](url)`

    content = content.substring(0, start) + newText + content.substring(end)

    setTimeout(() => {
      contentTextarea.focus()
      // Select "url" for easy replacement
      const urlStart = start + linkText.length + 3
      contentTextarea.setSelectionRange(urlStart, urlStart + 3)
    }, 0)
  }

  function insertImage() {
    if (!contentTextarea) return

    const start = contentTextarea.selectionStart
    const end = contentTextarea.selectionEnd
    const selectedText = content.substring(start, end)

    const altText = selectedText || 'image description'
    const newText = `![${altText}](image-url)`

    content = content.substring(0, start) + newText + content.substring(end)

    setTimeout(() => {
      contentTextarea.focus()
      const urlStart = start + altText.length + 4
      contentTextarea.setSelectionRange(urlStart, urlStart + 9)
    }, 0)
  }

  // Helper to check if a category is admin-only
  function isAdminOnlyCategory(category) {
    const slug = category.slug?.toLowerCase() || ''
    return slug.includes('news') || slug.includes('announcement') || category.admin_only === true
  }

  // Filter categories based on user role
  const categories = $derived(
    auth.isAdmin
      ? allCategories
      : allCategories.filter(c => !isAdminOnlyCategory(c))
  )

  onMount(async () => {
    await loadCategories()

    // Pre-select category if provided (only if user has access)
    if (categorySlug && categories.length > 0) {
      const cat = categories.find(c => c.slug === categorySlug)
      if (cat) {
        selectedCategory = cat.id
      }
    }
  })

  async function loadCategories() {
    loading = true
    try {
      const { data, error: catError } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('is_locked', false)
        .order('sort_order')

      if (catError) throw catError
      allCategories = data

      // Select first available category for this user
      if (categories.length > 0 && !selectedCategory) {
        selectedCategory = categories[0].id
      }
    } catch (e) {
      console.error('Error loading categories:', e)
    } finally {
      loading = false
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!auth.isAuthenticated) {
      showAuthModal = true
      return
    }

    if (!title.trim() || !content.trim() || !selectedCategory) {
      error = 'Please fill in all required fields.'
      return
    }

    submitting = true
    error = null

    try {
      const slug = generateUniqueSlug(title)

      const { data, error: postError } = await supabase
        .from('forum_posts')
        .insert({
          author_id: auth.user.id,
          category_id: selectedCategory,
          title: title.trim(),
          slug,
          content: content.trim()
        })
        .select()
        .single()

      if (postError) throw postError

      // Update category post count
      const category = categories.find(c => c.id === selectedCategory)
      if (category) {
        await supabase
          .from('forum_categories')
          .update({ post_count: (category.post_count || 0) + 1 })
          .eq('id', selectedCategory)
      }

      // Navigate to the new post
      onnavigate(`forum-post-${slug}`)
    } catch (e) {
      console.error('Error creating post:', e)
      error = e.message
    } finally {
      submitting = false
    }
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
        <span class="current">New Post</span>
      </nav>

      <div class="page-header">
        <h1 class="page-title">Create New Post</h1>
        <p class="page-subtitle">Start a new discussion in the community</p>
      </div>

      {#if !auth.isAuthenticated}
        <Panel>
          <div class="auth-prompt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2>Sign in to Post</h2>
            <p>You need to be logged in to create a new post.</p>
            <button class="auth-btn" onclick={() => showAuthModal = true}>
              Sign In / Create Account
            </button>
          </div>
        </Panel>
      {:else}
        <Panel>
          <form class="post-form" onsubmit={handleSubmit}>
            <!-- Category Selection -->
            <div class="form-group">
              <label for="category">Category <span class="required">*</span></label>
              <select
                id="category"
                bind:value={selectedCategory}
                disabled={submitting || loading}
                required
              >
                {#if loading}
                  <option value="">Loading categories...</option>
                {:else}
                  {#each categories as category}
                    <option value={category.id}>{category.name}</option>
                  {/each}
                {/if}
              </select>
            </div>

            <!-- Title -->
            <div class="form-group">
              <label for="title">Title <span class="required">*</span></label>
              <input
                type="text"
                id="title"
                bind:value={title}
                placeholder="Enter a descriptive title"
                maxlength="200"
                disabled={submitting}
                required
              />
              <span class="char-count">{title.length}/200</span>
            </div>

            <!-- Content -->
            <div class="form-group">
              <label for="content">Content <span class="required">*</span></label>

              <!-- Formatting Toolbar -->
              <div class="editor-toolbar">
                <div class="toolbar-group">
                  <button type="button" class="toolbar-btn" title="Bold (Ctrl+B)" onclick={() => insertFormat('**')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                    </svg>
                  </button>
                  <button type="button" class="toolbar-btn" title="Italic (Ctrl+I)" onclick={() => insertFormat('*')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="19" y1="4" x2="10" y2="4" />
                      <line x1="14" y1="20" x2="5" y2="20" />
                      <line x1="15" y1="4" x2="9" y2="20" />
                    </svg>
                  </button>
                  <button type="button" class="toolbar-btn" title="Strikethrough" onclick={() => insertFormat('~~')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 3.6 3.9h.2m8.2 0c1.1.5 1.6 1.8 1.6 3.1 0 3.6-3.3 4.5-6.8 4.5-1.3 0-2.6-.1-3.9-.3" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                    </svg>
                  </button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
                  <button type="button" class="toolbar-btn" title="Heading 1" onclick={() => insertLineFormat('# ')}>
                    <span class="toolbar-text">H1</span>
                  </button>
                  <button type="button" class="toolbar-btn" title="Heading 2" onclick={() => insertLineFormat('## ')}>
                    <span class="toolbar-text">H2</span>
                  </button>
                  <button type="button" class="toolbar-btn" title="Heading 3" onclick={() => insertLineFormat('### ')}>
                    <span class="toolbar-text">H3</span>
                  </button>
                </div>

                <div class="toolbar-divider"></div>

                <div class="toolbar-group">
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
                  <button type="button" class="toolbar-btn" title="Numbered List" onclick={() => insertLineFormat('1. ')}>
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
                  <button type="button" class="toolbar-btn" title="Insert Link" onclick={insertLink}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </button>
                  <button type="button" class="toolbar-btn" title="Insert Image" onclick={insertImage}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                  <button type="button" class="toolbar-btn" title="Quote" onclick={() => insertLineFormat('> ')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
                    </svg>
                  </button>
                  <button type="button" class="toolbar-btn" title="Code Block" onclick={() => insertFormat('```\n', '\n```')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </button>
                </div>

                <div class="toolbar-spacer"></div>

                <button
                  type="button"
                  class="preview-toggle"
                  class:active={showPreview}
                  onclick={() => showPreview = !showPreview}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>

              {#if showPreview}
                <div class="preview-pane">
                  <div class="preview-content markdown-content">
                    {@html renderMarkdown(content)}
                  </div>
                </div>
              {:else}
                <textarea
                  id="content"
                  bind:value={content}
                  bind:this={contentTextarea}
                  placeholder="Write your post content here... Supports Markdown formatting."
                  rows="12"
                  maxlength="10000"
                  disabled={submitting}
                  required
                ></textarea>
              {/if}
              <div class="editor-footer">
                <span class="format-hint">{showPreview ? 'Preview mode' : 'Supports Markdown formatting'}</span>
                <span class="char-count">{content.length}/10000</span>
              </div>
            </div>

            {#if error}
              <div class="error-message">{error}</div>
            {/if}

            <div class="form-actions">
              <Button variant="secondary" onclick={() => onnavigate('forum')} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting || !title.trim() || !content.trim()}>
                {submitting ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </form>
        </Panel>
      {/if}
    </div>
  </main>

  <Footer />
</div>

<AuthModal bind:open={showAuthModal} onclose={() => showAuthModal = false} />

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
    max-width: 48rem;
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
    margin-bottom: 2rem;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .page-subtitle {
    font-size: 0.95rem;
    color: #a89880;
    margin: 0.25rem 0 0 0;
  }

  /* Auth Prompt */
  .auth-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 3rem 2rem;
  }

  .auth-prompt svg {
    width: 48px;
    height: 48px;
    color: #d4a44c;
    margin-bottom: 1.5rem;
  }

  .auth-prompt h2 {
    font-size: 1.5rem;
    color: #f5d898;
    margin: 0 0 0.75rem 0;
  }

  .auth-prompt p {
    font-size: 0.95rem;
    color: #a89880;
    margin: 0 0 1.5rem 0;
  }

  .auth-btn {
    padding: 0.75rem 1.5rem;
    font-family: 'Cinzel', serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #1a1208;
    background: linear-gradient(180deg, #e8c36b 0%, #c49a3a 50%, #a67c28 100%);
    border: 2px solid #8b6914;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .auth-btn:hover {
    background: linear-gradient(180deg, #f0d080 0%, #d4a844 50%, #b88830 100%);
  }

  /* Form */
  .post-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #c4b8a4;
  }

  .required {
    color: #c46b6b;
  }

  select,
  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    color: #f0e6d8;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a7a6a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    padding-right: 2.5rem;
  }

  select option {
    background: #2a241c;
    color: #f0e6d8;
  }

  select:focus,
  input[type="text"]:focus,
  textarea:focus {
    outline: none;
    border-color: #d4a44c;
    box-shadow: 0 0 0 3px rgba(212, 164, 76, 0.15);
  }

  input::placeholder,
  textarea::placeholder {
    color: #6b5a48;
  }

  select:disabled,
  input:disabled,
  textarea:disabled {
    opacity: 0.6;
  }

  textarea {
    resize: vertical;
    min-height: 200px;
    line-height: 1.6;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
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

  .toolbar-text {
    font-size: 0.75rem;
    font-weight: 700;
    font-family: 'Cinzel', serif;
  }

  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
  }

  .format-hint {
    font-size: 0.75rem;
    color: #6b5a48;
  }

  .char-count {
    font-size: 0.75rem;
    color: #6b5a48;
  }

  @media (max-width: 640px) {
    .editor-toolbar {
      gap: 0.125rem;
      padding: 0.375rem;
    }

    .toolbar-divider {
      display: none;
    }

    .toolbar-btn {
      width: 28px;
      height: 28px;
    }

    .toolbar-btn svg {
      width: 16px;
      height: 16px;
    }

    .toolbar-spacer {
      display: none;
    }

    .preview-toggle {
      margin-left: 0.25rem;
    }
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

  /* Preview Pane */
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

  .preview-content :global(.empty-preview) {
    color: #6b5a48;
    font-style: italic;
  }

  /* Markdown Styles */
  .markdown-content :global(h2.md-h1) {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0.5rem 0;
  }

  .markdown-content :global(h3.md-h2) {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f0e6d8;
    margin: 0.5rem 0;
  }

  .markdown-content :global(h4.md-h3) {
    font-size: 1.1rem;
    font-weight: 600;
    color: #e0d6c8;
    margin: 0.35rem 0;
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
    gap: 1rem;
    padding-top: 0.5rem;
  }
</style>
