import { supabase, getStorageUrl } from '../supabase.js'
import { getProject as getModtaleProject } from '../modtale.js'

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
      id, title, slug, description, thumbnail_path, download_count, view_count, total_votes,
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
      id, title, slug, description, thumbnail_path, download_count, view_count, total_votes, created_at,
      author:profiles(username, avatar_url),
      tags:build_tags(tag:tags(name, slug, color))
    `, { count: 'exact' })
    .eq('status', 'published')

  if (tag) {
    // Filter builds that have this tag by querying through the junction table
    const { data: buildIds } = await supabase
      .from('build_tags')
      .select('build_id, tag:tags!inner(slug)')
      .eq('tag.slug', tag)

    if (buildIds && buildIds.length > 0) {
      const ids = buildIds.map(b => b.build_id)
      query = query.in('id', ids)
    } else {
      // No builds have this tag, return empty
      return { builds: [], total: 0, page, limit }
    }
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
    .in('status', ['online', 'pending'])
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
  // When filtering by tag, we need to use an inner join approach
  let selectQuery = `
    id, name, slug, description, icon_url, banner_url, status, current_players, max_players, source,
    owner:profiles(username, avatar_url),
    tags:server_tags(tag:tags(name, slug, color))
  `

  let query = supabase
    .from('servers')
    .select(selectQuery, { count: 'exact' })

  if (status && status !== 'all') {
    // When filtering for 'online', include 'pending' (unverified) servers too
    if (status === 'online') {
      query = query.in('status', ['online', 'pending'])
    } else {
      query = query.eq('status', status)
    }
  }

  if (tag) {
    // Filter servers that have this tag by querying through the junction table
    const { data: serverIds } = await supabase
      .from('server_tags')
      .select('server_id, tag:tags!inner(slug)')
      .eq('tag.slug', tag)

    if (serverIds && serverIds.length > 0) {
      const ids = serverIds.map(s => s.server_id)
      query = query.in('id', ids)
    } else {
      // No servers have this tag, return empty
      return { servers: [], total: 0, page, limit }
    }
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
// FAVORITES
// ============================================

export async function addFavorite(contentType, contentId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to save favorites')

  const { data, error } = await supabase
    .from('favorites')
    .insert({
      user_id: user.id,
      content_type: contentType,
      content_id: contentId
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // Already favorited, not an error
      return null
    }
    throw error
  }

  return data
}

export async function removeFavorite(contentType, contentId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to remove favorites')

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('content_type', contentType)
    .eq('content_id', contentId)

  if (error) throw error
}

export async function checkFavorite(contentType, contentId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .maybeSingle()

  if (error) {
    console.error('Error checking favorite:', error)
    return false
  }

  return !!data
}

export async function fetchUserFavorites() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { builds: [], mods: [], servers: [] }

  const { data: favorites, error } = await supabase
    .from('favorites')
    .select('content_type, content_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching favorites:', error)
    return { builds: [], mods: [], servers: [] }
  }

  // Group by content type
  const buildIds = favorites.filter(f => f.content_type === 'build').map(f => f.content_id)
  const modSlugs = favorites.filter(f => f.content_type === 'mod').map(f => f.content_id)
  const serverIds = favorites.filter(f => f.content_type === 'server').map(f => f.content_id)

  // Separate local mods from Modtale mods
  const localModSlugs = modSlugs.filter(s => s.startsWith('local-')).map(s => s.slice(6))
  const modtaleSlugs = modSlugs.filter(s => !s.startsWith('local-'))

  // Fetch the actual content
  const [builds, servers, localMods] = await Promise.all([
    buildIds.length > 0 ? supabase
      .from('builds')
      .select('id, title, slug, thumbnail_path, author:profiles(username)')
      .in('id', buildIds)
      .then(({ data }) => data?.map(b => ({
        ...b,
        thumbnail: getStorageUrl('thumbnails', b.thumbnail_path)
      })) || [])
    : [],
    serverIds.length > 0 ? supabase
      .from('servers')
      .select('id, name, slug, icon_url, status, current_players, max_players')
      .in('id', serverIds)
      .then(({ data }) => data?.map(s => ({
        ...s,
        icon: resolveImageUrl('servers', s.icon_url)
      })) || [])
    : [],
    localModSlugs.length > 0 ? supabase
      .from('mods')
      .select('id, title, slug, icon_path, author:profiles(username)')
      .in('slug', localModSlugs)
      .then(({ data }) => data?.map(m => ({
        slug: `local-${m.slug}`,
        title: m.title,
        thumbnail: getStorageUrl('mod-images', m.icon_path),
        author: m.author?.username || 'Unknown',
        source: 'local'
      })) || [])
    : []
  ])

  // Fetch mods from Modtale API (external)
  let modtaleMods = []
  if (modtaleSlugs.length > 0) {
    const modPromises = modtaleSlugs.map(async (slug) => {
      try {
        const mod = await getModtaleProject(slug)
        return {
          slug: mod.slug,
          title: mod.title,
          thumbnail: mod.thumbnail_url || mod.iconUrl,
          author: mod.author || mod.owner?.username || 'Unknown',
          source: 'modtale'
        }
      } catch (e) {
        console.error(`Error fetching mod ${slug}:`, e)
        return null
      }
    })
    modtaleMods = (await Promise.all(modPromises)).filter(Boolean)
  }

  return { builds, mods: [...localMods, ...modtaleMods], servers }
}

// ============================================
// COMMENTS
// ============================================

export async function fetchComments(contentType, contentId) {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, content, created_at, updated_at,
      author:profiles(id, username, avatar_url)
    `)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching comments:', error)
    return []
  }

  return data
}

export async function addComment(contentType, contentId, content) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to comment')

  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: user.id,
      content_type: contentType,
      content_id: contentId,
      content: content.trim()
    })
    .select(`
      id, content, created_at, updated_at,
      author:profiles(id, username, avatar_url)
    `)
    .single()

  if (error) throw error
  return data
}

export async function updateComment(commentId, content) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to edit comment')

  const { data, error } = await supabase
    .from('comments')
    .update({
      content: content.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .eq('user_id', user.id)
    .select(`
      id, content, created_at, updated_at,
      author:profiles(id, username, avatar_url)
    `)
    .single()

  if (error) throw error
  return data
}

export async function deleteComment(commentId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
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

// ============================================
// LOCAL MODS
// ============================================

export async function fetchLocalMods({ page = 0, size = 20, search = '', classification = '', sortBy = 'downloads' } = {}) {
  let query = supabase
    .from('mods')
    .select(`
      id, title, slug, description, classification, icon_path, download_count, view_count, rating_average, rating_count, created_at, updated_at,
      author:profiles(username, avatar_url),
      tags:mod_tags(tag:tags(name, slug)),
      versions:mod_versions(version_number, file_path, created_at)
    `, { count: 'exact' })
    .eq('status', 'published')

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (classification) {
    query = query.eq('classification', classification)
  }

  // Sort
  const sortMap = {
    downloads: { column: 'download_count', ascending: false },
    newest: { column: 'created_at', ascending: false },
    updated: { column: 'updated_at', ascending: false },
    title: { column: 'title', ascending: true }
  }
  const sort = sortMap[sortBy] || sortMap.downloads
  query = query.order(sort.column, { ascending: sort.ascending })

  // Pagination
  query = query.range(page * size, (page + 1) * size - 1)

  const { data, error, count } = await query

  if (error) throw error

  return {
    mods: data.map(mod => {
      // Get the latest version (sorted by created_at desc)
      const sortedVersions = (mod.versions || []).sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )
      const latestVersion = sortedVersions[0]

      return {
        id: mod.id,
        title: mod.title,
        slug: `local-${mod.slug}`,
        description: mod.description,
        classification: mod.classification,
        iconUrl: getStorageUrl('mod-images', mod.icon_path),
        downloads: mod.download_count || 0,
        rating: parseFloat(mod.rating_average) || 0,
        ratingCount: mod.rating_count || 0,
        author: mod.author?.username || 'Unknown',
        tags: mod.tags?.map(t => t.tag?.name).filter(Boolean) || [],
        updatedAt: mod.updated_at,
        createdAt: mod.created_at,
        source: 'local',
        latestVersion: latestVersion?.version_number || '1.0.0',
        latestDownloadUrl: latestVersion?.file_path ? getStorageUrl('mods', latestVersion.file_path) : null
      }
    }),
    total: count || 0,
    page,
    size
  }
}

export async function fetchLocalModBySlug(slug) {
  // Remove 'local-' prefix if present
  const cleanSlug = slug.startsWith('local-') ? slug.slice(6) : slug

  // Fetch the main mod data
  const { data, error } = await supabase
    .from('mods')
    .select(`
      *,
      author:profiles(id, username, avatar_url),
      tags:mod_tags(tag:tags(id, name, slug)),
      versions:mod_versions(id, version_number, changelog, file_path, file_size, game_versions, created_at),
      gallery:mod_gallery(id, image_path, sort_order)
    `)
    .eq('slug', cleanSlug)
    .single()

  if (error) throw error

  // Fetch dependencies separately to avoid complex join issues
  let dependencies = []
  try {
    const { data: depsData } = await supabase
      .from('mod_dependencies')
      .select(`
        id,
        dependency_type,
        dependency_slug,
        dependency_title,
        dependency_mod_id
      `)
      .eq('mod_id', data.id)

    if (depsData && depsData.length > 0) {
      // Fetch local mod details for dependencies that reference local mods
      const localModIds = depsData.filter(d => d.dependency_mod_id).map(d => d.dependency_mod_id)
      let localModsMap = {}

      if (localModIds.length > 0) {
        const { data: localMods } = await supabase
          .from('mods')
          .select('id, title, slug, icon_path')
          .in('id', localModIds)

        if (localMods) {
          localModsMap = Object.fromEntries(localMods.map(m => [m.id, m]))
        }
      }

      dependencies = depsData.map(dep => {
        const localMod = dep.dependency_mod_id ? localModsMap[dep.dependency_mod_id] : null
        return {
          id: dep.id,
          type: dep.dependency_type,
          isLocal: !!localMod,
          slug: localMod ? `local-${localMod.slug}` : dep.dependency_slug,
          title: localMod?.title || dep.dependency_title,
          iconUrl: localMod?.icon_path ? getStorageUrl('mod-images', localMod.icon_path) : null
        }
      })
    }
  } catch (e) {
    // Dependencies table might not exist or other error - continue without
    console.log('Could not fetch dependencies:', e.message)
  }

  data.dependencies = dependencies

  // Increment view count
  try {
    await supabase.rpc('increment_mod_view', { mod_uuid: data.id })
  } catch (e) {
    // Ignore errors - function may not exist yet
  }

  return {
    id: data.id,
    title: data.title,
    slug: `local-${data.slug}`,
    description: data.description,
    about: data.about,
    changelog: data.changelog,
    classification: data.classification,
    status: data.status,
    iconUrl: getStorageUrl('mod-images', data.icon_path),
    bannerUrl: data.banner_path ? getStorageUrl('mod-images', data.banner_path) : null,
    downloads: data.download_count || 0,
    viewCount: data.view_count || 0,
    rating: parseFloat(data.rating_average) || 0,
    ratingCount: data.rating_count || 0,
    author: data.author?.username || 'Unknown',
    authorId: data.author?.id,
    tags: data.tags?.map(t => t.tag?.name).filter(Boolean) || [],
    versions: (data.versions || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(v => ({
        id: v.id,
        versionNumber: v.version_number,
        changelog: v.changelog,
        filePath: v.file_path,
        fileSize: v.file_size,
        gameVersions: v.game_versions || [],
        createdAt: v.created_at,
        downloadUrl: getStorageUrl('mods', v.file_path)
      })),
    gallery: (data.gallery || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(g => ({
        id: g.id,
        url: getStorageUrl('mod-images', g.image_path)
      })),
    dependencies: data.dependencies || [],
    repositoryUrl: data.repository_url,
    sourceType: data.source_type,
    discordUrl: data.discord_url,
    websiteUrl: data.website_url,
    license: data.license,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    source: 'local'
  }
}

export async function updateLocalMod(modId, updates) {
  const { data, error } = await supabase
    .from('mods')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', modId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLocalMod(modId) {
  // First get the mod to find file paths
  const { data: mod } = await supabase
    .from('mods')
    .select('slug, icon_path, author_id, versions:mod_versions(file_path), gallery:mod_gallery(image_path)')
    .eq('id', modId)
    .single()

  if (mod) {
    // Delete mod files from storage
    const filesToDelete = mod.versions?.map(v => v.file_path).filter(Boolean) || []
    if (filesToDelete.length > 0) {
      await supabase.storage.from('mods').remove(filesToDelete)
    }

    // Delete images from storage
    const imagesToDelete = [
      mod.icon_path,
      ...(mod.gallery?.map(g => g.image_path) || [])
    ].filter(Boolean)
    if (imagesToDelete.length > 0) {
      await supabase.storage.from('mod-images').remove(imagesToDelete)
    }
  }

  // Delete the mod record (cascades to versions, tags, gallery)
  const { error } = await supabase
    .from('mods')
    .delete()
    .eq('id', modId)

  if (error) throw error
}

export async function createModVersion(modId, versionData) {
  const { data, error } = await supabase
    .from('mod_versions')
    .insert({
      mod_id: modId,
      ...versionData
    })
    .select()
    .single()

  if (error) throw error

  // Update mod's updated_at
  await supabase
    .from('mods')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', modId)

  return data
}

export async function deleteModVersion(versionId, filePath) {
  // Delete file from storage
  if (filePath) {
    await supabase.storage.from('mods').remove([filePath])
  }

  const { error } = await supabase
    .from('mod_versions')
    .delete()
    .eq('id', versionId)

  if (error) throw error
}

export async function incrementModDownload(modId) {
  try {
    await supabase.rpc('increment_mod_download', { mod_uuid: modId })
  } catch (e) {
    // Ignore errors - function may not exist yet
  }
}

// ============================================
// MOD DEPENDENCIES
// ============================================

export async function fetchModDependencies(modId) {
  try {
    const { data, error } = await supabase
      .from('mod_dependencies')
      .select(`
        id,
        dependency_type,
        dependency_slug,
        dependency_title,
        dependency_mod:mods!mod_dependencies_dependency_mod_id_fkey(id, title, slug, icon_path)
      `)
      .eq('mod_id', modId)

    if (error) {
      // Table might not exist yet
      console.error('Error fetching dependencies:', error)
      return []
    }

    return data.map(dep => ({
      id: dep.id,
      type: dep.dependency_type,
      isLocal: !!dep.dependency_mod,
      slug: dep.dependency_mod ? `local-${dep.dependency_mod.slug}` : dep.dependency_slug,
      title: dep.dependency_mod?.title || dep.dependency_title,
      iconUrl: dep.dependency_mod?.icon_path ? getStorageUrl('mod-images', dep.dependency_mod.icon_path) : null
    }))
  } catch (e) {
    console.error('Error fetching dependencies:', e)
    return []
  }
}

export async function addModDependency(modId, dependency) {
  try {
    const insertData = {
      mod_id: modId,
      dependency_type: dependency.type || 'required'
    }

    if (dependency.isLocal && dependency.localModId) {
      insertData.dependency_mod_id = dependency.localModId
    } else {
      insertData.dependency_slug = dependency.slug
      insertData.dependency_title = dependency.title
    }

    const { data, error } = await supabase
      .from('mod_dependencies')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (e) {
    console.error('Error adding dependency:', e)
    throw new Error('Dependencies feature not available yet. Please apply the latest database migration.')
  }
}

export async function removeModDependency(dependencyId) {
  try {
    const { error } = await supabase
      .from('mod_dependencies')
      .delete()
      .eq('id', dependencyId)

    if (error) throw error
  } catch (e) {
    console.error('Error removing dependency:', e)
    throw new Error('Dependencies feature not available yet. Please apply the latest database migration.')
  }
}

export async function searchLocalMods(search) {
  const { data, error } = await supabase
    .from('mods')
    .select('id, title, slug, icon_path')
    .eq('status', 'published')
    .ilike('title', `%${search}%`)
    .limit(10)

  if (error) {
    console.error('Error searching mods:', error)
    return []
  }

  return data.map(mod => ({
    id: mod.id,
    title: mod.title,
    slug: `local-${mod.slug}`,
    iconUrl: mod.icon_path ? getStorageUrl('mod-images', mod.icon_path) : null,
    isLocal: true
  }))
}

// ==================== MOD RATINGS ====================

export async function rateLocalMod(modId, rating) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to rate')

  const { data, error } = await supabase
    .from('mod_ratings')
    .upsert({
      mod_id: modId,
      user_id: user.id,
      rating: rating,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'mod_id,user_id'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserModRating(modId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('mod_ratings')
    .select('rating')
    .eq('mod_id', modId)
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user rating:', error)
  }

  return data?.rating || null
}

export async function getModRating(modId) {
  const { data, error } = await supabase
    .from('mods')
    .select('rating_average, rating_count')
    .eq('id', modId)
    .single()

  if (error) {
    console.error('Error fetching mod rating:', error)
    return { average: 0, count: 0 }
  }

  return {
    average: parseFloat(data.rating_average) || 0,
    count: data.rating_count || 0
  }
}
