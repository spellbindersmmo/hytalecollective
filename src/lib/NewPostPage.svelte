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

  let categories = $state([])
  let selectedCategory = $state('')
  let title = $state('')
  let content = $state('')
  let loading = $state(true)
  let submitting = $state(false)
  let error = $state(null)
  let showAuthModal = $state(false)

  onMount(async () => {
    await loadCategories()

    // Pre-select category if provided
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
      categories = data

      if (data.length > 0 && !selectedCategory) {
        selectedCategory = data[0].id
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
              <textarea
                id="content"
                bind:value={content}
                placeholder="Write your post content here..."
                rows="10"
                maxlength="10000"
                disabled={submitting}
                required
              ></textarea>
              <span class="char-count">{content.length}/10000</span>
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
  }

  .char-count {
    position: absolute;
    right: 0;
    top: 0;
    font-size: 0.75rem;
    color: #6b5a48;
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
