<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase, getStorageUrl } from './supabase.js'
  import { deleteBuild } from './stores/data.svelte.js'

  let { onnavigate = () => {} } = $props()

  let activeTab = $state('builds')
  let loading = $state(true)
  let builds = $state([])
  let users = $state([])
  let forumPosts = $state([])
  let servers = $state([])
  let stats = $state({ users: 0, builds: 0, posts: 0, servers: 0 })

  let deleteConfirm = $state(null)
  let deleting = $state(false)

  onMount(() => {
    if (auth.isAdmin) {
      loadData()
    }
  })

  async function loadData() {
    loading = true
    try {
      // Load stats
      const [
        { count: usersCount },
        { count: buildsCount },
        { count: postsCount },
        { count: serversCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('builds').select('*', { count: 'exact', head: true }),
        supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
        supabase.from('servers').select('*', { count: 'exact', head: true })
      ])

      stats = {
        users: usersCount || 0,
        builds: buildsCount || 0,
        posts: postsCount || 0,
        servers: serversCount || 0
      }

      // Load recent builds
      const { data: buildsData } = await supabase
        .from('builds')
        .select(`
          *,
          author:profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      builds = (buildsData || []).map(b => ({
        ...b,
        thumbnail: getStorageUrl('thumbnails', b.thumbnail_path)
      }))

      // Load users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      users = usersData || []

      // Load forum posts
      const { data: postsData } = await supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(username),
          category:forum_categories(name, color)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      forumPosts = postsData || []

      // Load servers
      const { data: serversData } = await supabase
        .from('servers')
        .select(`
          *,
          owner:profiles(username)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      servers = serversData || []

    } catch (e) {
      console.error('Error loading admin data:', e)
    } finally {
      loading = false
    }
  }

  async function handleDeleteBuild(build) {
    deleting = true
    try {
      await deleteBuild(build.id, build.file_path, build.thumbnail_path)
      builds = builds.filter(b => b.id !== build.id)
      stats.builds--
      deleteConfirm = null
    } catch (e) {
      console.error('Error deleting build:', e)
      alert('Failed to delete build')
    } finally {
      deleting = false
    }
  }

  async function handleDeletePost(post) {
    deleting = true
    try {
      // Delete replies first
      await supabase.from('forum_replies').delete().eq('post_id', post.id)
      // Delete post
      const { error } = await supabase.from('forum_posts').delete().eq('id', post.id)
      if (error) throw error
      forumPosts = forumPosts.filter(p => p.id !== post.id)
      stats.posts--
      deleteConfirm = null
    } catch (e) {
      console.error('Error deleting post:', e)
      alert('Failed to delete post')
    } finally {
      deleting = false
    }
  }

  async function handleDeleteServer(server) {
    deleting = true
    try {
      await supabase.from('server_tags').delete().eq('server_id', server.id)
      const { error } = await supabase.from('servers').delete().eq('id', server.id)
      if (error) throw error
      servers = servers.filter(s => s.id !== server.id)
      stats.servers--
      deleteConfirm = null
    } catch (e) {
      console.error('Error deleting server:', e)
      alert('Failed to delete server')
    } finally {
      deleting = false
    }
  }

  async function toggleUserAdmin(user) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !user.is_admin })
        .eq('id', user.id)

      if (error) throw error

      users = users.map(u =>
        u.id === user.id ? { ...u, is_admin: !u.is_admin } : u
      )
    } catch (e) {
      console.error('Error updating user:', e)
      alert('Failed to update user')
    }
  }

  async function toggleUserVerified(user) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !user.is_verified })
        .eq('id', user.id)

      if (error) throw error

      users = users.map(u =>
        u.id === user.id ? { ...u, is_verified: !u.is_verified } : u
      )
    } catch (e) {
      console.error('Error updating user:', e)
      alert('Failed to update user')
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
</script>

<div class="page">
  <Navbar currentPage="admin" {onnavigate} />

  <main class="main">
    <div class="container">
      {#if !auth.isAdmin}
        <Panel>
          <div class="access-denied">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <h2>Access Denied</h2>
            <p>You don't have permission to access this page.</p>
            <Button variant="primary" onclick={() => onnavigate('home')}>
              Go Home
            </Button>
          </div>
        </Panel>
      {:else}
        <div class="admin-header">
          <h1>Admin Panel</h1>
          <p>Manage users, content, and site settings</p>
        </div>

        <!-- Stats Overview -->
        <div class="stats-row">
          <Panel>
            <div class="stat-card">
              <span class="stat-value">{stats.users}</span>
              <span class="stat-label">Users</span>
            </div>
          </Panel>
          <Panel>
            <div class="stat-card">
              <span class="stat-value">{stats.builds}</span>
              <span class="stat-label">Builds</span>
            </div>
          </Panel>
          <Panel>
            <div class="stat-card">
              <span class="stat-value">{stats.posts}</span>
              <span class="stat-label">Forum Posts</span>
            </div>
          </Panel>
          <Panel>
            <div class="stat-card">
              <span class="stat-value">{stats.servers}</span>
              <span class="stat-label">Servers</span>
            </div>
          </Panel>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab" class:active={activeTab === 'builds'} onclick={() => activeTab = 'builds'}>
            Builds
          </button>
          <button class="tab" class:active={activeTab === 'users'} onclick={() => activeTab = 'users'}>
            Users
          </button>
          <button class="tab" class:active={activeTab === 'posts'} onclick={() => activeTab = 'posts'}>
            Forum Posts
          </button>
          <button class="tab" class:active={activeTab === 'servers'} onclick={() => activeTab = 'servers'}>
            Servers
          </button>
        </div>

        {#if loading}
          <div class="loading">Loading...</div>
        {:else}
          <!-- Builds Tab -->
          {#if activeTab === 'builds'}
            <Panel>
              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Downloads</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each builds as build}
                      <tr>
                        <td>
                          {#if build.thumbnail}
                            <img src={build.thumbnail} alt="" class="thumb" />
                          {:else}
                            <div class="thumb-placeholder"></div>
                          {/if}
                        </td>
                        <td>
                          <button class="link-btn" onclick={() => onnavigate(`build-${build.slug}`)}>
                            {build.title}
                          </button>
                        </td>
                        <td>{build.author?.username || 'Unknown'}</td>
                        <td>{build.download_count || 0}</td>
                        <td>{formatDate(build.created_at)}</td>
                        <td>
                          <button class="action-btn delete" onclick={() => deleteConfirm = { type: 'build', item: build }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </Panel>
          {/if}

          <!-- Users Tab -->
          {#if activeTab === 'users'}
            <Panel>
              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Avatar</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Admin</th>
                      <th>Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each users as user}
                      <tr>
                        <td>
                          {#if user.avatar_url}
                            <img src={user.avatar_url} alt="" class="avatar" />
                          {:else}
                            <div class="avatar-placeholder">{user.username?.charAt(0).toUpperCase() || '?'}</div>
                          {/if}
                        </td>
                        <td>
                          <button class="link-btn" onclick={() => onnavigate(`profile-${user.username}`)}>
                            {user.username}
                          </button>
                        </td>
                        <td class="email">{user.email || '-'}</td>
                        <td>{formatDate(user.created_at)}</td>
                        <td>
                          <button
                            class="toggle-btn"
                            class:active={user.is_admin}
                            onclick={() => toggleUserAdmin(user)}
                          >
                            {user.is_admin ? 'Yes' : 'No'}
                          </button>
                        </td>
                        <td>
                          <button
                            class="toggle-btn"
                            class:active={user.is_verified}
                            onclick={() => toggleUserVerified(user)}
                          >
                            {user.is_verified ? 'Yes' : 'No'}
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </Panel>
          {/if}

          <!-- Forum Posts Tab -->
          {#if activeTab === 'posts'}
            <Panel>
              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Author</th>
                      <th>Replies</th>
                      <th>Views</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each forumPosts as post}
                      <tr>
                        <td>
                          <button class="link-btn" onclick={() => onnavigate(`forum-post-${post.slug}`)}>
                            {post.title}
                          </button>
                        </td>
                        <td>
                          <span class="category-tag" style="color: {post.category?.color}">
                            {post.category?.name}
                          </span>
                        </td>
                        <td>{post.author?.username || 'Unknown'}</td>
                        <td>{post.reply_count || 0}</td>
                        <td>{post.view_count || 0}</td>
                        <td>{formatDate(post.created_at)}</td>
                        <td>
                          <button class="action-btn delete" onclick={() => deleteConfirm = { type: 'post', item: post }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </Panel>
          {/if}

          <!-- Servers Tab -->
          {#if activeTab === 'servers'}
            <Panel>
              <div class="table-container">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Owner</th>
                      <th>Players</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each servers as server}
                      <tr>
                        <td>
                          <button class="link-btn" onclick={() => onnavigate(`server-${server.slug}`)}>
                            {server.name}
                          </button>
                        </td>
                        <td>{server.owner?.username || 'Unknown'}</td>
                        <td>{server.current_players || 0}/{server.max_players || 0}</td>
                        <td>
                          <span class="status-badge" class:online={server.status === 'online'}>
                            {server.status}
                          </span>
                        </td>
                        <td>{server.source || 'community'}</td>
                        <td>{formatDate(server.created_at)}</td>
                        <td>
                          <button class="action-btn delete" onclick={() => deleteConfirm = { type: 'server', item: server }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </Panel>
          {/if}
        {/if}
      {/if}
    </div>
  </main>

  <Footer {onnavigate} />
</div>

<!-- Delete Confirmation Modal -->
{#if deleteConfirm}
  <div class="modal-overlay" onclick={() => deleteConfirm = null}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h3>Confirm Delete</h3>
      <p>Are you sure you want to delete this {deleteConfirm.type}?</p>
      <p class="item-name">"{deleteConfirm.item.title || deleteConfirm.item.name}"</p>
      <div class="modal-actions">
        <button class="cancel-btn" onclick={() => deleteConfirm = null} disabled={deleting}>
          Cancel
        </button>
        <button
          class="confirm-delete-btn"
          disabled={deleting}
          onclick={() => {
            if (deleteConfirm.type === 'build') handleDeleteBuild(deleteConfirm.item)
            else if (deleteConfirm.type === 'post') handleDeletePost(deleteConfirm.item)
            else if (deleteConfirm.type === 'server') handleDeleteServer(deleteConfirm.item)
          }}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
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
    max-width: 80rem;
    margin: 0 auto;
  }

  .admin-header {
    margin-bottom: 2rem;
  }

  .admin-header h1 {
    font-size: 2rem;
    color: #f5d898;
    margin: 0 0 0.5rem 0;
  }

  .admin-header p {
    color: #8a7a6a;
    margin: 0;
  }

  .access-denied {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem;
    text-align: center;
  }

  .access-denied svg {
    width: 64px;
    height: 64px;
    color: #c46b6b;
    margin-bottom: 1rem;
  }

  .access-denied h2 {
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  .access-denied p {
    color: #8a7a6a;
    margin: 0 0 1.5rem 0;
  }

  /* Stats Row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  @media (min-width: 768px) {
    .stats-row {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .stat-card {
    text-align: center;
    padding: 1rem;
  }

  .stat-card .stat-value {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #d4a44c;
  }

  .stat-card .stat-label {
    font-size: 0.85rem;
    color: #8a7a6a;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #3d3428;
    overflow-x: auto;
  }

  .tab {
    padding: 0.75rem 1.25rem;
    font-family: 'Cinzel', serif;
    font-size: 0.9rem;
    font-weight: 600;
    color: #8a7a6a;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    margin-bottom: -1px;
  }

  .tab:hover {
    color: #c4b8a4;
  }

  .tab.active {
    color: #d4a44c;
    border-bottom-color: #d4a44c;
  }

  .loading {
    padding: 3rem;
    text-align: center;
    color: #8a7a6a;
  }

  /* Table */
  .table-container {
    overflow-x: auto;
  }

  .admin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .admin-table th {
    text-align: left;
    padding: 0.75rem;
    color: #8a7a6a;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #3d3428;
  }

  .admin-table td {
    padding: 0.75rem;
    color: #c4b8a4;
    border-bottom: 1px solid #2d2820;
    vertical-align: middle;
  }

  .admin-table tr:hover td {
    background: rgba(60, 50, 40, 0.2);
  }

  .thumb {
    width: 48px;
    height: 32px;
    object-fit: cover;
    border-radius: 4px;
  }

  .thumb-placeholder {
    width: 48px;
    height: 32px;
    background: #2a241c;
    border-radius: 4px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(180deg, #d4a44c 0%, #a67c28 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.8rem;
    color: #1a1208;
  }

  .email {
    font-size: 0.8rem;
    color: #6b5a48;
  }

  .link-btn {
    background: none;
    border: none;
    color: #6bb8cc;
    cursor: pointer;
    text-align: left;
    padding: 0;
  }

  .link-btn:hover {
    text-decoration: underline;
  }

  .action-btn {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    border: none;
  }

  .action-btn.delete {
    background: rgba(196, 107, 107, 0.2);
    color: #e8a0a0;
  }

  .action-btn.delete:hover {
    background: rgba(196, 107, 107, 0.3);
  }

  .toggle-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    background: rgba(100, 90, 80, 0.3);
    border: 1px solid #4a3f32;
    color: #8a7a6a;
  }

  .toggle-btn.active {
    background: rgba(126, 196, 123, 0.2);
    border-color: #5a9a57;
    color: #7ec47b;
  }

  .category-tag {
    font-size: 0.8rem;
    font-weight: 600;
  }

  .status-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.75rem;
    border-radius: 4px;
    background: rgba(100, 90, 80, 0.3);
    color: #8a7a6a;
  }

  .status-badge.online {
    background: rgba(126, 196, 123, 0.2);
    color: #7ec47b;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
  }

  .modal-content h3 {
    color: #f5d898;
    margin: 0 0 1rem 0;
  }

  .modal-content p {
    color: #c4b8a4;
    margin: 0 0 0.5rem 0;
  }

  .item-name {
    color: #8a7a6a;
    font-style: italic;
    margin-bottom: 1.5rem !important;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .cancel-btn {
    padding: 0.6rem 1.25rem;
    background: linear-gradient(180deg, #4d4235 0%, #3a3127 100%);
    border: 1px solid #6b5a48;
    border-radius: 6px;
    color: #f0e6d8;
    cursor: pointer;
  }

  .cancel-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #5a4d3e 0%, #453a2e 100%);
  }

  .confirm-delete-btn {
    padding: 0.6rem 1.25rem;
    background: linear-gradient(180deg, #8a3535 0%, #6a2525 100%);
    border: 1px solid #a04545;
    border-radius: 6px;
    color: #fff;
    cursor: pointer;
  }

  .confirm-delete-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #a04545 0%, #8a3535 100%);
  }

  .cancel-btn:disabled,
  .confirm-delete-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
