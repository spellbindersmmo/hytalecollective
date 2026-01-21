import { supabase, getStorageUrl } from '../supabase.js'

// ============================================
// BUILDS
// ============================================

export async function fetchFeaturedBuilds(limit = 4) {
  const { data, error } = await supabase
    .from('builds')
    .select(`
      *,
      author:profiles(username, avatar_url),
      tags:build_tags(tag:tags(name, slug, color))
    `)
    .eq('status', 'published')
    .order('download_count', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.map(build => ({
    ...build,
    thumbnail: getStorageUrl('thumbnails', build.thumbnail_path),
    tags: build.tags.map(t => t.tag.name)
  }))
}

export async function fetchBuilds({ page = 1, limit = 20, tag = null, search = null, sortBy = 'created_at' }) {
  let query = supabase
    .from('builds')
    .select(`
      *,
      author:profiles(username, avatar_url),
      tags:build_tags(tag:tags(name, slug, color))
    `, { count: 'exact' })
    .eq('status', 'published')

  if (tag) {
    query = query.contains('tags', [{ tag: { slug: tag } }])
  }

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data, error, count } = await query
    .order(sortBy, { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw error

  return {
    builds: data.map(build => ({
      ...build,
      thumbnail: getStorageUrl('thumbnails', build.thumbnail_path),
      tags: build.tags.map(t => t.tag.name)
    })),
    total: count,
    page,
    limit
  }
}

export async function fetchBuildBySlug(slug) {
  const { data, error } = await supabase
    .from('builds')
    .select(`
      *,
      author:profiles(id, username, avatar_url, bio),
      tags:build_tags(tag:tags(name, slug, color))
    `)
    .eq('slug', slug)
    .single()

  if (error) throw error

  // Increment view count
  await supabase
    .from('builds')
    .update({ view_count: data.view_count + 1 })
    .eq('id', data.id)

  return {
    ...data,
    thumbnail: getStorageUrl('thumbnails', data.thumbnail_path),
    file_url: getStorageUrl('builds', data.file_path),
    tags: data.tags.map(t => t.tag)
  }
}

// ============================================
// WORLDS
// ============================================

export async function fetchFeaturedWorlds(limit = 4) {
  const { data, error } = await supabase
    .from('worlds')
    .select(`
      *,
      author:profiles(username, avatar_url),
      tags:world_tags(tag:tags(name, slug, color))
    `)
    .eq('status', 'published')
    .order('download_count', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.map(world => ({
    ...world,
    thumbnail: getStorageUrl('thumbnails', world.thumbnail_path),
    tags: world.tags.map(t => t.tag.name)
  }))
}

export async function fetchWorldBySlug(slug) {
  const { data, error } = await supabase
    .from('worlds')
    .select(`
      *,
      author:profiles(id, username, avatar_url, bio),
      tags:world_tags(tag:tags(name, slug, color))
    `)
    .eq('slug', slug)
    .single()

  if (error) throw error

  // Increment view count
  await supabase
    .from('worlds')
    .update({ view_count: data.view_count + 1 })
    .eq('id', data.id)

  return {
    ...data,
    thumbnail: getStorageUrl('thumbnails', data.thumbnail_path),
    screenshots: (data.screenshots || []).map(path => getStorageUrl('thumbnails', path)),
    file_url: getStorageUrl('worlds', data.file_path),
    tags: data.tags.map(t => t.tag)
  }
}

// ============================================
// SERVERS
// ============================================

export async function fetchFeaturedServers(limit = 4) {
  const { data, error } = await supabase
    .from('servers')
    .select(`
      *,
      owner:profiles(username, avatar_url),
      tags:server_tags(tag:tags(name, slug, color))
    `)
    .eq('status', 'online')
    .order('current_players', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.map(server => ({
    ...server,
    icon: getStorageUrl('servers', server.icon_url),
    banner: getStorageUrl('servers', server.banner_url),
    tags: server.tags.map(t => t.tag.name)
  }))
}

export async function fetchServers({ page = 1, limit = 20, tag = null, status = null, sortBy = 'current_players' }) {
  let query = supabase
    .from('servers')
    .select(`
      *,
      owner:profiles(username, avatar_url),
      tags:server_tags(tag:tags(name, slug, color))
    `, { count: 'exact' })

  if (status) {
    query = query.eq('status', status)
  }

  if (tag) {
    query = query.contains('tags', [{ tag: { slug: tag } }])
  }

  const { data, error, count } = await query
    .order(sortBy, { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw error

  return {
    servers: data.map(server => ({
      ...server,
      icon: getStorageUrl('servers', server.icon_url),
      banner: getStorageUrl('servers', server.banner_url),
      tags: server.tags.map(t => t.tag.name)
    })),
    total: count,
    page,
    limit
  }
}

// ============================================
// FORUM
// ============================================

export async function fetchForumCategories() {
  const { data, error } = await supabase
    .from('forum_categories')
    .select('*')
    .order('sort_order')

  if (error) throw error
  return data
}

export async function fetchRecentPosts(limit = 5) {
  const { data, error } = await supabase
    .from('forum_posts')
    .select(`
      *,
      author:profiles(username, avatar_url),
      category:forum_categories(name, slug, color)
    `)
    .order('last_activity_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.map(post => ({
    ...post,
    category: post.category.name,
    categoryColor: post.category.color,
    lastActivity: formatRelativeTime(post.last_activity_at)
  }))
}

export async function fetchPostsByCategory(categorySlug, { page = 1, limit = 20 }) {
  const { data, error, count } = await supabase
    .from('forum_posts')
    .select(`
      *,
      author:profiles(username, avatar_url),
      category:forum_categories!inner(name, slug, color)
    `, { count: 'exact' })
    .eq('category.slug', categorySlug)
    .order('is_pinned', { ascending: false })
    .order('last_activity_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw error

  return {
    posts: data.map(post => ({
      ...post,
      category: post.category.name,
      lastActivity: formatRelativeTime(post.last_activity_at)
    })),
    total: count,
    page,
    limit
  }
}

export async function fetchPostBySlug(slug) {
  const { data, error } = await supabase
    .from('forum_posts')
    .select(`
      *,
      author:profiles(id, username, avatar_url, bio, created_at),
      category:forum_categories(name, slug, color),
      replies:forum_replies(
        *,
        author:profiles(id, username, avatar_url)
      )
    `)
    .eq('slug', slug)
    .single()

  if (error) throw error

  // Increment view count
  await supabase
    .from('forum_posts')
    .update({ view_count: data.view_count + 1 })
    .eq('id', data.id)

  return {
    ...data,
    replies: data.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }
}

// ============================================
// TAGS
// ============================================

export async function fetchPopularTags(limit = 20) {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('usage_count', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// ============================================
// DOWNLOADS
// ============================================

export async function recordDownload(contentType, contentId) {
  const { error } = await supabase
    .from('downloads')
    .insert({
      content_type: contentType,
      content_id: contentId
    })

  if (error) console.error('Error recording download:', error)
}

// ============================================
// HELPERS
// ============================================

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
