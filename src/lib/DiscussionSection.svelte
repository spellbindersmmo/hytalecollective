<script>
  import { auth } from './stores/auth.svelte.js'
  import { fetchComments, addComment, updateComment, deleteComment } from './stores/data.svelte.js'
  import Button from './Button.svelte'

  let { contentType = '', contentId = '', onnavigate = () => {} } = $props()

  let comments = $state([])
  let loading = $state(true)
  let newComment = $state('')
  let submitting = $state(false)
  let error = $state(null)

  // Edit state
  let editingId = $state(null)
  let editContent = $state('')
  let saving = $state(false)

  // Delete state
  let deletingId = $state(null)

  $effect(() => {
    if (contentType && contentId) {
      loadComments()
    }
  })

  async function loadComments() {
    loading = true
    try {
      comments = await fetchComments(contentType, contentId)
    } catch (e) {
      console.error('Error loading comments:', e)
    } finally {
      loading = false
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    submitting = true
    error = null
    try {
      const comment = await addComment(contentType, contentId, newComment)
      comments = [...comments, comment]
      newComment = ''
    } catch (e) {
      error = e.message
    } finally {
      submitting = false
    }
  }

  function startEditing(comment) {
    editingId = comment.id
    editContent = comment.content
  }

  function cancelEditing() {
    editingId = null
    editContent = ''
  }

  async function saveEdit(commentId) {
    if (!editContent.trim() || saving) return

    saving = true
    try {
      const updated = await updateComment(commentId, editContent)
      comments = comments.map(c => c.id === commentId ? updated : c)
      editingId = null
      editContent = ''
    } catch (e) {
      console.error('Error updating comment:', e)
    } finally {
      saving = false
    }
  }

  async function handleDelete(commentId) {
    deletingId = commentId
    try {
      await deleteComment(commentId)
      comments = comments.filter(c => c.id !== commentId)
    } catch (e) {
      console.error('Error deleting comment:', e)
    } finally {
      deletingId = null
    }
  }

  function formatTime(date) {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return then.toLocaleDateString()
  }

  function canManageComment(comment) {
    return auth.user?.id === comment.author?.id || auth.isAdmin
  }
</script>

<div class="discussion-section">
  <h3 class="section-title">
    Discussion
    <span class="comment-count">({comments.length})</span>
  </h3>

  {#if loading}
    <div class="loading">Loading comments...</div>
  {:else}
    <!-- Comment Form -->
    {#if auth.isAuthenticated}
      <form class="comment-form" onsubmit={handleSubmit}>
        <div class="form-row">
          <div class="avatar-wrapper">
            <div class="avatar-placeholder">
              {auth.profile?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            {#if auth.profile?.avatar_url?.startsWith('http')}
              <img
                src={auth.profile.avatar_url}
                alt=""
                class="avatar"
                onerror={(e) => e.target.style.display = 'none'}
              />
            {/if}
          </div>
          <textarea
            bind:value={newComment}
            placeholder="Write a comment..."
            rows="3"
            disabled={submitting}
          ></textarea>
        </div>
        {#if error}
          <p class="error-message">{error}</p>
        {/if}
        <div class="form-actions">
          <Button type="submit" variant="primary" disabled={submitting || !newComment.trim()}>
            {submitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>
    {:else}
      <div class="login-prompt">
        <button class="login-btn" onclick={() => auth.openModal()}>
          Login to join the discussion
        </button>
      </div>
    {/if}

    <!-- Comments List -->
    {#if comments.length === 0}
      <div class="no-comments">
        <p>No comments yet. Be the first to start the discussion!</p>
      </div>
    {:else}
      <div class="comments-list">
        {#each comments as comment}
          <div class="comment" class:editing={editingId === comment.id}>
            <button
              class="comment-avatar-btn"
              onclick={() => onnavigate(`profile-${comment.author?.username}`)}
            >
              <div class="avatar-wrapper">
                <div class="avatar-placeholder">
                  {comment.author?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                {#if comment.author?.avatar_url?.startsWith('http')}
                  <img
                    src={comment.author.avatar_url}
                    alt=""
                    class="avatar"
                    onerror={(e) => e.target.style.display = 'none'}
                  />
                {/if}
              </div>
            </button>

            <div class="comment-body">
              <div class="comment-header">
                <button
                  class="comment-author"
                  onclick={() => onnavigate(`profile-${comment.author?.username}`)}
                >
                  {comment.author?.username || 'Unknown'}
                </button>
                <span class="comment-time">
                  {formatTime(comment.created_at)}
                  {#if comment.updated_at !== comment.created_at}
                    <span class="edited">(edited)</span>
                  {/if}
                </span>
              </div>

              {#if editingId === comment.id}
                <textarea
                  bind:value={editContent}
                  class="edit-textarea"
                  rows="3"
                  disabled={saving}
                ></textarea>
                <div class="edit-actions">
                  <button
                    class="save-edit-btn"
                    onclick={() => saveEdit(comment.id)}
                    disabled={saving || !editContent.trim()}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button class="cancel-edit-btn" onclick={cancelEditing} disabled={saving}>
                    Cancel
                  </button>
                </div>
              {:else}
                <div class="comment-content">{comment.content}</div>

                {#if canManageComment(comment)}
                  <div class="comment-actions">
                    <button class="action-btn" onclick={() => startEditing(comment)}>
                      Edit
                    </button>
                    <button
                      class="action-btn delete"
                      onclick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                    >
                      {deletingId === comment.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .discussion-section {
    padding: 0.5rem;
  }

  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0 0 1rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .comment-count {
    font-weight: 400;
    color: #8a7a6a;
  }

  .loading {
    text-align: center;
    color: #8a7a6a;
    padding: 2rem 0;
  }

  /* Comment Form */
  .comment-form {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: flex;
    gap: 0.75rem;
  }

  .avatar-wrapper {
    position: relative;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }

  .avatar-placeholder {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(180deg, #4a3f32 0%, #3a3127 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c4b8a4;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .avatar {
    position: absolute;
    top: 0;
    left: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
  }

  .comment-form textarea {
    flex: 1;
    padding: 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
    color: #f0e6d8;
    font-size: 0.9rem;
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
  }

  .comment-form textarea:focus {
    outline: none;
    border-color: #6bb8cc;
  }

  .comment-form textarea::placeholder {
    color: #6a5a4a;
  }

  .comment-form textarea:disabled {
    opacity: 0.6;
  }

  .error-message {
    margin: 0.5rem 0 0 calc(36px + 0.75rem);
    font-size: 0.85rem;
    color: #c46b6b;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.75rem;
  }

  /* Login Prompt */
  .login-prompt {
    text-align: center;
    padding: 1rem;
    margin-bottom: 1rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
  }

  .login-btn {
    padding: 0;
    background: none;
    border: none;
    color: #d4a44c;
    font-size: 0.9rem;
    cursor: pointer;
    transition: color 0.15s;
  }

  .login-btn:hover {
    color: #e8c36b;
    text-decoration: underline;
  }

  /* No Comments */
  .no-comments {
    text-align: center;
    padding: 2rem 1rem;
    color: #6a5a4a;
  }

  .no-comments p {
    margin: 0;
  }

  /* Comments List */
  .comments-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .comment {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
  }

  .comment.editing {
    border-color: #4a3f32;
  }

  .comment-avatar-btn {
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  .comment-body {
    flex: 1;
    min-width: 0;
  }

  .comment-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .comment-author {
    padding: 0;
    background: none;
    border: none;
    color: #f0e6d8;
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: color 0.15s;
  }

  .comment-author:hover {
    color: #d4a44c;
  }

  .comment-time {
    font-size: 0.75rem;
    color: #6a5a4a;
  }

  .edited {
    font-style: italic;
  }

  .comment-content {
    font-size: 0.9rem;
    color: #c4b8a4;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Edit Mode */
  .edit-textarea {
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(180deg, #1e1a15 0%, #1a1612 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #f0e6d8;
    font-size: 0.9rem;
    font-family: inherit;
    resize: vertical;
    margin-bottom: 0.5rem;
  }

  .edit-textarea:focus {
    outline: none;
    border-color: #6bb8cc;
  }

  .edit-actions {
    display: flex;
    gap: 0.5rem;
  }

  .save-edit-btn {
    padding: 0.4rem 0.75rem;
    background: linear-gradient(180deg, #3a5a3a 0%, #2d4a2d 100%);
    border: 1px solid #4a6a4a;
    border-radius: 4px;
    color: #b8e0b8;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .save-edit-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #4a6a4a 0%, #3a5a3a 100%);
  }

  .save-edit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cancel-edit-btn {
    padding: 0.4rem 0.75rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #c4b8a4;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .cancel-edit-btn:hover:not(:disabled) {
    border-color: #6b5a48;
  }

  .cancel-edit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Comment Actions */
  .comment-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .action-btn {
    padding: 0;
    background: none;
    border: none;
    color: #6a5a4a;
    font-size: 0.75rem;
    cursor: pointer;
    transition: color 0.15s;
  }

  .action-btn:hover:not(:disabled) {
    color: #8a7a6a;
  }

  .action-btn.delete:hover:not(:disabled) {
    color: #c46b6b;
  }

  .action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
