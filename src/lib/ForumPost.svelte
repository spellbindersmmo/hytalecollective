<script>
  let {
    title = 'Untitled Post',
    author = 'Unknown',
    category = 'General',
    replies = 0,
    views = 0,
    lastActivity = 'Just now'
  } = $props()

  const categoryColors = {
    'General': { bg: '#4a3f32', text: '#c4b8a4' },
    'Help': { bg: '#3a4a4d', text: '#6bb8cc' },
    'Showcase': { bg: '#4a4230', text: '#d4a44c' },
    'News': { bg: '#3a4d3a', text: '#7ec47b' },
    'Discussion': { bg: '#4d3a3a', text: '#c46b6b' }
  }

  let colors = $derived(categoryColors[category] || categoryColors['General'])
</script>

<div class="forum-post">
  <div class="post-main">
    <div class="post-category">
      <span class="category-badge" style="background: {colors.bg}; color: {colors.text}; border-color: {colors.text}40;">
        {category}
      </span>
    </div>
    <h3 class="post-title">{title}</h3>
    <p class="post-meta">by <span class="author">{author}</span> · {lastActivity}</p>
  </div>

  <div class="post-stats">
    <div class="stat">
      <span class="stat-value">{replies}</span>
      <span class="stat-label">replies</span>
    </div>
    <div class="stat">
      <span class="stat-value">{views}</span>
      <span class="stat-label">views</span>
    </div>
  </div>
</div>

<style>
  .forum-post {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .forum-post:hover .post-title {
    color: #d4a44c;
  }

  .post-main {
    flex: 1;
    min-width: 0;
  }

  .post-category {
    margin-bottom: 0.25rem;
  }

  .category-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid;
    border-radius: 2px;
  }

  .post-title {
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    font-weight: 500;
    color: #f0e6d8;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s ease;
  }

  .post-meta {
    font-size: 0.8rem;
    color: #c4b8a4;
    margin: 0.25rem 0 0 0;
  }

  .author {
    color: #e8c36b;
  }

  .post-stats {
    display: flex;
    gap: 1.5rem;
    flex-shrink: 0;
  }

  .stat {
    text-align: right;
  }

  .stat-value {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #f0e6d8;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #c4b8a4;
  }
</style>
