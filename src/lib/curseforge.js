// CurseForge API Service
// Uses Vite proxy in development to avoid CORS issues
const API_BASE = '/api/curseforge'

// Hytale game ID on CurseForge
// To find this, run: getAllGames() and look for Hytale in the console
let HYTALE_GAME_ID = 70216 // Hytale game ID on CurseForge

// Class IDs for mod categories
const MOD_CLASS_ID = 6 // Mods class

async function cfFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    throw new Error(`CurseForge API error: ${response.status}`)
  }

  return response.json()
}

// Search for mods
export async function searchMods({
  searchFilter = '',
  sortField = 2, // 1=Featured, 2=Popularity, 3=LastUpdated, 4=Name, 5=Author, 6=TotalDownloads
  sortOrder = 'desc',
  pageSize = 20,
  index = 0,
  categoryId = null
} = {}) {
  const params = new URLSearchParams({
    gameId: HYTALE_GAME_ID,
    classId: MOD_CLASS_ID,
    sortField: sortField.toString(),
    sortOrder,
    pageSize: pageSize.toString(),
    index: index.toString()
  })

  if (searchFilter) {
    params.append('searchFilter', searchFilter)
  }

  if (categoryId) {
    params.append('categoryId', categoryId.toString())
  }

  const { data, pagination } = await cfFetch(`/mods/search?${params}`)

  return {
    mods: data.map(formatMod),
    pagination: {
      index: pagination.index,
      pageSize: pagination.pageSize,
      totalCount: pagination.totalCount
    }
  }
}

// Get a single mod by ID
export async function getMod(modId) {
  const { data } = await cfFetch(`/mods/${modId}`)
  return formatMod(data)
}

// Get mod description (HTML)
export async function getModDescription(modId) {
  const { data } = await cfFetch(`/mods/${modId}/description`)
  return data
}

// Get mod files
export async function getModFiles(modId, { pageSize = 20, index = 0 } = {}) {
  const params = new URLSearchParams({
    pageSize: pageSize.toString(),
    index: index.toString()
  })

  const { data, pagination } = await cfFetch(`/mods/${modId}/files?${params}`)

  return {
    files: data.map(formatFile),
    pagination
  }
}

// Get categories for Hytale mods
export async function getCategories() {
  const { data } = await cfFetch(`/categories?gameId=${HYTALE_GAME_ID}&classId=${MOD_CLASS_ID}`)
  return data.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    iconUrl: cat.iconUrl
  }))
}

// Get featured mods
export async function getFeaturedMods() {
  const { data } = await cfFetch('/mods/featured', {
    method: 'POST',
    body: JSON.stringify({
      gameId: HYTALE_GAME_ID,
      excludedModIds: []
    })
  })

  return {
    featured: data.featured?.map(formatMod) || [],
    popular: data.popular?.map(formatMod) || [],
    recentlyUpdated: data.recentlyUpdated?.map(formatMod) || []
  }
}

// Format mod data for our UI
function formatMod(mod) {
  return {
    id: mod.id,
    name: mod.name,
    slug: mod.slug,
    summary: mod.summary,
    downloadCount: mod.downloadCount,
    thumbUrl: mod.logo?.thumbnailUrl || null,
    iconUrl: mod.logo?.url || null,
    categories: mod.categories?.map(c => ({ id: c.id, name: c.name, slug: c.slug })) || [],
    authors: mod.authors?.map(a => ({ id: a.id, name: a.name, url: a.url })) || [],
    dateCreated: mod.dateCreated,
    dateModified: mod.dateModified,
    dateReleased: mod.dateReleased,
    latestFiles: mod.latestFiles?.map(formatFile) || [],
    links: {
      websiteUrl: mod.links?.websiteUrl,
      wikiUrl: mod.links?.wikiUrl,
      sourceUrl: mod.links?.sourceUrl,
      issuesUrl: mod.links?.issuesUrl
    }
  }
}

// Format file data
function formatFile(file) {
  return {
    id: file.id,
    displayName: file.displayName,
    fileName: file.fileName,
    fileDate: file.fileDate,
    fileLength: file.fileLength,
    downloadCount: file.downloadCount,
    downloadUrl: file.downloadUrl,
    gameVersions: file.gameVersions || []
  }
}

// Format download count for display
export function formatDownloads(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}

// Sort field options for UI
export const sortOptions = [
  { value: 1, label: 'Featured' },
  { value: 2, label: 'Popularity' },
  { value: 3, label: 'Last Updated' },
  { value: 4, label: 'Name' },
  { value: 5, label: 'Author' },
  { value: 6, label: 'Total Downloads' }
]

// Helper to find all games (use this to find Hytale's game ID)
// Run in browser console: import('/src/lib/curseforge.js').then(m => m.getAllGames())
export async function getAllGames() {
  try {
    const response = await fetch('/api/curseforge/games')
    console.log('Response status:', response.status)

    if (!response.ok) {
      const text = await response.text()
      console.log('Error response:', text)
      throw new Error(`API error: ${response.status}`)
    }

    const { data } = await response.json()
    console.log('All CurseForge games:')
    data.forEach(game => {
      console.log(`${game.id}: ${game.name} (${game.slug})`)
    })
    const hytale = data.find(g => g.name.toLowerCase().includes('hytale'))
    if (hytale) {
      console.log(`\nHytale Game ID: ${hytale.id}`)
    }
    return data
  } catch (e) {
    console.error('Failed:', e)
    throw e
  }
}
