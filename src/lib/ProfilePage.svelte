<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import BuildCard from './BuildCard.svelte'
  import ServerCard from './ServerCard.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase, getStorageUrl } from './supabase.js'

  let { username = '', onnavigate = () => {} } = $props()

  let profile = $state(null)
  let builds = $state([])
  let servers = $state([])
  let forumPosts = $state([])
  let stats = $state({ builds: 0, downloads: 0, posts: 0, servers: 0, points: 0 })
  let loading = $state(true)
  let activeTab = $state('builds')
  let isOwnProfile = $derived(auth.profile?.username === username)

  onMount(() => {
    loadProfile()
  })

  async function loadProfile() {
    loading = true
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError
      profile = profileData

      // Fetch user's builds
      const { data: buildsData, count: buildsCount } = await supabase
        .from('builds')
        .select(`
          *,
          author:profiles(username, avatar_url),
          tags:build_tags(tag:tags(name, slug, color))
        `, { count: 'exact' })
        .eq('author_id', profile.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6)

      builds = (buildsData || []).map(build => ({
        ...build,
        thumbnail: getStorageUrl('thumbnails', build.thumbnail_path),
        tags: build.tags?.map(t => t.tag.name) || []
      }))

      // Fetch user's servers
      const { data: serversData, count: serversCount } = await supabase
        .from('servers')
        .select(`
          *,
          tags:server_tags(tag:tags(name, slug))
        `, { count: 'exact' })
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(6)

      servers = (serversData || []).map(server => ({
        ...server,
        icon: server.icon_path ? getStorageUrl('server-icons', server.icon_path) : null,
        banner: server.banner_path ? getStorageUrl('server-banners', server.banner_path) : null,
        tags: server.tags?.map(t => t.tag.name) || []
      }))

      // Fetch forum posts
      const { data: postsData, count: postsCount } = await supabase
        .from('forum_posts')
        .select(`
          *,
          category:forum_categories(name, slug, color)
        `, { count: 'exact' })
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)

      forumPosts = postsData || []

      // Fetch ALL builds to get total downloads (not just displayed ones)
      const { data: allBuildsData } = await supabase
        .from('builds')
        .select('download_count, view_count')
        .eq('author_id', profile.id)
        .eq('status', 'published')

      // Calculate total downloads
      const totalDownloads =
        (allBuildsData || []).reduce((sum, b) => sum + (b.download_count || 0), 0)

      // Get total replies received on user's posts
      const totalRepliesReceived =
        (postsData || []).reduce((sum, p) => sum + (p.reply_count || 0), 0)

      // Get replies made by user
      const { count: repliesMadeCount } = await supabase
        .from('forum_replies')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', profile.id)

      // Calculate points:
      // - 2 points per download
      // - 10 points per build uploaded
      // - 5 points per reply received on your posts
      // - 3 points per forum post created
      // - 1 point per reply made
      const points =
        (totalDownloads * 2) +
        ((buildsCount || 0) * 10) +
        (totalRepliesReceived * 5) +
        ((postsCount || 0) * 3) +
        ((repliesMadeCount || 0) * 1)

      stats = {
        builds: buildsCount || 0,
        downloads: totalDownloads,
        posts: postsCount || 0,
        servers: serversCount || 0,
        points
      }

    } catch (e) {
      console.error('Error loading profile:', e)
    } finally {
      loading = false
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }

  function formatRelativeTime(date) {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now - then
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays < 1) return 'Today'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(date)
  }
</script>

<div class="page">
  <Navbar currentPage="profile" {onnavigate} />

  <main class="main">
    <div class="container">
      {#if loading}
        <div class="loading">Loading profile...</div>
      {:else if !profile}
        <Panel>
          <div class="not-found">
            <h2>User Not Found</h2>
            <p>The user "{username}" doesn't exist.</p>
            <Button variant="secondary" onclick={() => onnavigate('home')}>
              Go Home
            </Button>
          </div>
        </Panel>
      {:else}
        <!-- Profile Header -->
        <Panel>
          <div class="profile-header">
            <div class="avatar-section">
              <div class="avatar">
                {#if profile.avatar_url}
                  <img src={profile.avatar_url} alt={profile.username} />
                {:else}
                  <span>{profile.username.charAt(0).toUpperCase()}</span>
                {/if}
              </div>
              {#if profile.is_verified}
                <div class="verified-badge" title="Verified">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              {/if}
            </div>

            <div class="profile-info">
              <div class="name-row">
                <h1 class="username">{profile.display_name || profile.username}</h1>
                {#if profile.display_name}
                  <span class="handle">@{profile.username}</span>
                {/if}
                <div class="points-badge" title="Reputation Points">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>{stats.points.toLocaleString()}</span>
                </div>
              </div>

              {#if profile.bio}
                <p class="bio">{profile.bio}</p>
              {/if}

              <div class="meta">
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Joined {formatDate(profile.created_at)}
                </span>
                {#if profile.website}
                  <a href={profile.website} target="_blank" rel="noopener" class="meta-item link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Website
                  </a>
                {/if}
                {#if profile.discord_username}
                  <span class="meta-item">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                    {profile.discord_username}
                  </span>
                {/if}
              </div>

              {#if isOwnProfile}
                <div class="profile-actions">
                  <Button variant="secondary" onclick={() => onnavigate('settings')}>
                    Edit Profile
                  </Button>
                </div>
              {/if}
            </div>

            <div class="stats-grid">
              <div class="stat">
                <span class="stat-value">{stats.points.toLocaleString()}</span>
                <span class="stat-label">Points</span>
              </div>
              <div class="stat">
                <span class="stat-value">{stats.builds}</span>
                <span class="stat-label">Builds</span>
              </div>
              <div class="stat">
                <span class="stat-value">{stats.servers}</span>
                <span class="stat-label">Servers</span>
              </div>
              <div class="stat">
                <span class="stat-value">{stats.downloads}</span>
                <span class="stat-label">Downloads</span>
              </div>
              <div class="stat">
                <span class="stat-value">{stats.posts}</span>
                <span class="stat-label">Posts</span>
              </div>
            </div>
          </div>
        </Panel>

        <!-- Content Tabs -->
        <div class="tabs">
          <button
            class="tab"
            class:active={activeTab === 'builds'}
            onclick={() => activeTab = 'builds'}
          >
            Builds ({stats.builds})
          </button>
          <button
            class="tab"
            class:active={activeTab === 'servers'}
            onclick={() => activeTab = 'servers'}
          >
            Servers ({stats.servers})
          </button>
          <button
            class="tab"
            class:active={activeTab === 'activity'}
            onclick={() => activeTab = 'activity'}
          >
            Activity
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          {#if activeTab === 'builds'}
            {#if builds.length === 0}
              <Panel>
                <div class="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  <p>No builds uploaded yet.</p>
                </div>
              </Panel>
            {:else}
              <div class="content-grid">
                {#each builds as build}
                  <BuildCard
                    title={build.title}
                    slug={build.slug}
                    author={build.author?.username}
                    thumbnail={build.thumbnail}
                    tags={build.tags}
                    downloads={build.download_count}
                    views={build.view_count}
                    votes={build.total_votes}
                  />
                {/each}
              </div>
              {#if stats.builds > 6}
                <div class="view-all">
                  <Button variant="secondary" onclick={() => onnavigate(`user-builds-${username}`)}>
                    View All Builds
                  </Button>
                </div>
              {/if}
            {/if}
          {:else if activeTab === 'servers'}
            {#if servers.length === 0}
              <Panel>
                <div class="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                  <p>No servers added yet.</p>
                </div>
              </Panel>
            {:else}
              <div class="servers-grid">
                {#each servers as server}
                  <ServerCard
                    name={server.name}
                    slug={server.slug}
                    description={server.description}
                    players={server.players || 0}
                    maxPlayers={server.max_players || 100}
                    tags={server.tags}
                    status={server.status}
                    icon={server.icon}
                    banner={server.banner}
                    source={server.source}
                    votes={server.votes || 0}
                    onclick={() => onnavigate(`server-${server.slug}`)}
                  />
                {/each}
              </div>
              {#if stats.servers > 6}
                <div class="view-all">
                  <Button variant="secondary" onclick={() => onnavigate(`user-servers-${username}`)}>
                    View All Servers
                  </Button>
                </div>
              {/if}
            {/if}
          {:else if activeTab === 'activity'}
            {#if forumPosts.length === 0}
              <Panel>
                <div class="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p>No forum activity yet.</p>
                </div>
              </Panel>
            {:else}
              <Panel>
                <div class="activity-list">
                  {#each forumPosts as post, i}
                    {#if i > 0}
                      <div class="activity-divider"></div>
                    {/if}
                    <button
                      class="activity-item"
                      onclick={() => onnavigate(`forum-post-${post.slug}`)}
                    >
                      <div class="activity-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div class="activity-content">
                        <span class="activity-action">Created a post in</span>
                        <span
                          class="activity-category"
                          style="color: {post.category?.color}"
                        >
                          {post.category?.name}
                        </span>
                        <h4 class="activity-title">{post.title}</h4>
                        <span class="activity-time">{formatRelativeTime(post.created_at)}</span>
                      </div>
                      <div class="activity-stats">
                        <span>{post.reply_count} replies</span>
                        <span>{post.view_count} views</span>
                      </div>
                    </button>
                  {/each}
                </div>
              </Panel>
            {/if}
          {/if}
        </div>
      {/if}
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
    max-width: 64rem;
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

  /* Profile Header */
  .profile-header {
    display: grid;
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .profile-header {
      grid-template-columns: auto 1fr auto;
      align-items: start;
    }
  }

  .avatar-section {
    position: relative;
    justify-self: center;
  }

  .avatar {
    width: 120px;
    height: 120px;
    border-radius: 12px;
    background: linear-gradient(180deg, #d4a44c 0%, #a67c28 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 3px solid #4a3f32;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar span {
    font-family: 'Cinzel', serif;
    font-size: 3rem;
    font-weight: 700;
    color: #1a1208;
  }

  .verified-badge {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 28px;
    height: 28px;
    background: linear-gradient(180deg, #7ec47b 0%, #5a9a57 100%);
    border: 2px solid #2a241c;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .verified-badge svg {
    width: 16px;
    height: 16px;
  }

  .profile-info {
    text-align: center;
  }

  @media (min-width: 640px) {
    .profile-info {
      text-align: left;
    }
  }

  .name-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  @media (min-width: 640px) {
    .name-row {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
  }

  .username {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .handle {
    font-size: 0.95rem;
    color: #8a7a6a;
  }

  .points-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.6rem;
    background: linear-gradient(180deg, #d4a44c 0%, #a67c28 100%);
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 700;
    color: #1a1208;
    box-shadow: 0 2px 6px rgba(212, 164, 76, 0.3);
  }

  .points-badge svg {
    width: 14px;
    height: 14px;
  }

  .bio {
    font-size: 0.95rem;
    color: #c4b8a4;
    margin: 0 0 1rem 0;
    line-height: 1.6;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    font-size: 0.85rem;
    color: #8a7a6a;
  }

  @media (min-width: 640px) {
    .meta {
      justify-content: flex-start;
    }
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .meta-item svg {
    width: 16px;
    height: 16px;
    opacity: 0.7;
  }

  .meta-item.link {
    color: #d4a44c;
    text-decoration: none;
  }

  .meta-item.link:hover {
    text-decoration: underline;
  }

  .profile-actions {
    margin-top: 1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    justify-self: center;
  }

  @media (min-width: 640px) {
    .stats-grid {
      justify-self: end;
      align-self: center;
    }
  }

  .stat {
    text-align: center;
    padding: 0.5rem;
  }

  .stat-value {
    display: block;
    font-family: 'Cinzel', serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f0e6d8;
  }

  .stat-label {
    font-size: 0.7rem;
    color: #8a7a6a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.25rem;
    margin: 2rem 0 1rem;
    border-bottom: 1px solid #3d3428;
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
    transition: all 0.15s;
    margin-bottom: -1px;
  }

  .tab:hover {
    color: #c4b8a4;
  }

  .tab.active {
    color: #d4a44c;
    border-bottom-color: #d4a44c;
  }

  /* Tab Content */
  .content-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .content-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .content-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .servers-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .servers-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .view-all {
    display: flex;
    justify-content: center;
    margin-top: 1.5rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 2rem;
    text-align: center;
    color: #8a7a6a;
  }

  .empty-state svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0;
  }

  /* Activity List */
  .activity-list {
    display: flex;
    flex-direction: column;
  }

  .activity-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #4a3f32, transparent);
    margin: 0.75rem 0;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.5rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.15s;
    width: 100%;
  }

  .activity-item:hover {
    background: rgba(60, 50, 40, 0.3);
  }

  .activity-icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(212, 164, 76, 0.1);
    border-radius: 8px;
    color: #d4a44c;
  }

  .activity-icon svg {
    width: 18px;
    height: 18px;
  }

  .activity-content {
    flex: 1;
    min-width: 0;
  }

  .activity-action {
    font-size: 0.8rem;
    color: #8a7a6a;
  }

  .activity-category {
    font-size: 0.8rem;
    font-weight: 600;
  }

  .activity-title {
    font-size: 0.95rem;
    font-weight: 500;
    color: #f0e6d8;
    margin: 0.25rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .activity-time {
    font-size: 0.75rem;
    color: #6b5a48;
  }

  .activity-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.75rem;
    color: #6b5a48;
  }
</style>
