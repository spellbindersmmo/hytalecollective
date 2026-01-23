import { supabase, getStorageUrl } from '../supabase.js'

// Helper to handle both external URLs and storage paths
function resolveImageUrl(bucket, path) {
  if (!path) return null
  // If it's already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // Otherwise, get from Supabase storage
  return getStorageUrl(bucket, path)
}

// ============================================
// BUILDS
// ============================================

export async function fetchFeaturedBuilds(limit = 4) {
  const { data, error } = await supabase
    .from('builds')
    .select(`
      id, title, slug, description, thumbnail_path, download_count, view_count,
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
      id, title, slug, description, thumbnail_path, download_count, view_count, created_at,
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

  // Increment view count using RPC function (bypasses RLS)
  await supabase.rpc('increment_build_view', { build_uuid: data.id })

  return {
    ...data,
    thumbnail: getStorageUrl('thumbnails', data.thumbnail_path),
    file_url: getStorageUrl('builds', data.file_path),
    tags: data.tags.map(t => t.tag)
  }
}

export async function updateBuild(buildId, updates) {
  const { data, error } = await supabase
    .from('builds')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', buildId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBuildTags(buildId, tagIds) {
  // Delete existing tags
  const { error: deleteError } = await supabase
    .from('build_tags')
    .delete()
    .eq('build_id', buildId)

  if (deleteError) throw deleteError

  // Insert new tags if any
  if (tagIds.length > 0) {
    const tagRecords = tagIds.map(tagId => ({
      build_id: buildId,
      tag_id: tagId
    }))

    const { error: insertError } = await supabase
      .from('build_tags')
      .insert(tagRecords)

    if (insertError) throw insertError
  }
}

export async function fetchAllTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('usage_count', { ascending: false })
    .limit(30)

  if (error) throw error
  return data
}

export async function deleteBuild(buildId, filePath, thumbnailPath) {
  // Delete storage files first
  if (filePath) {
    const { error: fileError } = await supabase.storage
      .from('builds')
      .remove([filePath])
    if (fileError) console.error('Error deleting build file:', fileError)
  }

  if (thumbnailPath) {
    const { error: thumbError } = await supabase.storage
      .from('thumbnails')
      .remove([thumbnailPath])
    if (thumbError) console.error('Error deleting thumbnail:', thumbError)
  }

  // Delete tags association
  const { error: tagError } = await supabase
    .from('build_tags')
    .delete()
    .eq('build_id', buildId)

  if (tagError) console.error('Error deleting build tags:', tagError)

  // Delete the build record
  const { error } = await supabase
    .from('builds')
    .delete()
    .eq('id', buildId)

  if (error) throw error
}

export async function voteForBuild(buildId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to vote')

  const { data, error } = await supabase
    .from('build_votes')
    .insert({
      build_id: buildId,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already voted for this build today')
    }
    throw error
  }

  return data
}

export async function checkBuildVote(buildId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('build_votes')
    .select('id')
    .eq('build_id', buildId)
    .eq('user_id', user.id)
    .eq('vote_date', new Date().toISOString().split('T')[0])
    .maybeSingle()

  if (error) {
    console.error('Error checking build vote:', error)
    return false
  }

  return !!data
}

// ============================================
// WORLDS
// ============================================

export async function fetchFeaturedWorlds(limit = 4) {
  const { data, error } = await supabase
    .from('worlds')
    .select(`
      id, title, slug, description, thumbnail_path, download_count, view_count,
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

  // Increment view count using RPC function (bypasses RLS)
  await supabase.rpc('increment_world_view', { world_uuid: data.id })

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
      id, name, slug, description, icon_url, banner_url, status, current_players, max_players,
      owner:profiles(username, avatar_url),
      tags:server_tags(tag:tags(name, slug, color))
    `)
    .eq('status', 'online')
    .order('current_players', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.map(server => ({
    ...server,
    icon: resolveImageUrl('servers', server.icon_url),
    banner: resolveImageUrl('servers', server.banner_url),
    tags: server.tags.map(t => t.tag.name)
  }))
}

export async function fetchServers({ page = 1, limit = 20, tag = null, status = null, search = null, source = null, sortBy = 'current_players' }) {
  let query = supabase
    .from('servers')
    .select(`
      id, name, slug, description, icon_url, banner_url, status, current_players, max_players, source,
      owner:profiles(username, avatar_url),
      tags:server_tags(tag:tags(name, slug, color))
    `, { count: 'exact' })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (tag) {
    query = query.contains('tags', [{ tag: { slug: tag } }])
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (source && source !== 'all') {
    query = query.eq('source', source)
  }

  const { data, error, count } = await query
    .order(sortBy, { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw error

  return {
    servers: data.map(server => ({
      ...server,
      icon: resolveImageUrl('servers', server.icon_url),
      banner: resolveImageUrl('servers', server.banner_url),
      tags: server.tags.map(t => t.tag.name)
    })),
    total: count,
    page,
    limit
  }
}

export async function fetchServerBySlug(slug) {
  const { data, error } = await supabase
    .from('servers')
    .select(`
      *,
      owner:profiles(id, username, avatar_url, bio),
      tags:server_tags(tag:tags(name, slug, color))
    `)
    .eq('slug', slug)
    .single()

  if (error) throw error

  // Increment view count using RPC function (bypasses RLS)
  await supabase.rpc('increment_server_view', { server_uuid: data.id })

  return {
    ...data,
    icon: resolveImageUrl('servers', data.icon_url),
    banner: resolveImageUrl('servers', data.banner_url),
    tags: data.tags.map(t => t.tag)
  }
}

export async function createServer(serverData) {
  // Generate slug from name
  const slug = serverData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36)

  const { data, error } = await supabase
    .from('servers')
    .insert({
      ...serverData,
      slug,
      source: 'community'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateServer(id, updates) {
  const { data, error } = await supabase
    .from('servers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function voteForServer(serverId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to vote')

  const { data, error } = await supabase
    .from('server_votes')
    .insert({
      server_id: serverId,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already voted for this server today')
    }
    throw error
  }

  return data
}

export async function checkUserVote(serverId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('server_votes')
    .select('id')
    .eq('server_id', serverId)
    .eq('user_id', user.id)
    .eq('vote_date', new Date().toISOString().split('T')[0])
    .maybeSingle()

  if (error) {
    console.error('Error checking vote:', error)
    return false
  }

  return !!data
}

export async function addServerTags(serverId, tagIds) {
  const inserts = tagIds.map(tagId => ({
    server_id: serverId,
    tag_id: tagId
  }))

  const { error } = await supabase
    .from('server_tags')
    .insert(inserts)

  if (error) throw error
}

export async function fetchServerTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name')

  if (error) throw error
  return data
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
      id, title, slug, reply_count, view_count, last_activity_at,
      author:profiles(username, avatar_url),
      category:forum_categories(name, slug, color)
    `)
    .order('last_activity_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return data.map(post => ({
    ...post,
    author: post.author?.username || 'Unknown',
    category: post.category.name,
    categoryColor: post.category.color,
    replies: post.reply_count || 0,
    views: post.view_count || 0,
    lastActivity: formatRelativeTime(post.last_activity_at)
  }))
}

export async function fetchPostsByCategory(categorySlug, { page = 1, limit = 20 }) {
  const { data, error, count } = await supabase
    .from('forum_posts')
    .select(`
      id, title, slug, reply_count, view_count, is_pinned, is_locked, is_solved, last_activity_at,
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

  // Increment view count using RPC function (bypasses RLS)
  await supabase.rpc('increment_post_view', { post_uuid: data.id })

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
