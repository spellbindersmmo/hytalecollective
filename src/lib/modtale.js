// Modtale API Service
// https://modtale.net/api-docs
const API_BASE = 'https://api.modtale.net/api/v1'

// Project classifications
export const classifications = {
  PLUGIN: 'PLUGIN',
  DATA: 'DATA',
  ART: 'ART',
  SAVE: 'SAVE',
  MODPACK: 'MODPACK'
}

// Sort options for the UI
export const sortOptions = [
  { value: 'downloads', label: 'Most Downloads' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'title', label: 'Name' }
]

// Classification options for filter
export const classificationOptions = [
  { value: '', label: 'All Types' },
  { value: 'PLUGIN', label: 'Plugins' },
  { value: 'DATA', label: 'Data Packs' },
  { value: 'ART', label: 'Art Packs' },
  { value: 'SAVE', label: 'Saves' },
  { value: 'MODPACK', label: 'Modpacks' }
]

async function apiFetch(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Modtale API error: ${response.status}`)
  }

  return response.json()
}

// Search for projects/mods
export async function searchProjects({
  search = '',
  page = 0,
  size = 20,
  sort = 'downloads',
  classification = '',
  tags = [],
  gameVersion = ''
} = {}) {
  const params = new URLSearchParams()

  if (search) params.append('search', search)
  params.append('page', page.toString())
  params.append('size', size.toString())
  params.append('sort', sort)

  if (classification) params.append('classification', classification)
  if (gameVersion) params.append('gameVersion', gameVersion)
  if (tags.length > 0) params.append('tags', tags.join(','))

  const data = await apiFetch(`/projects?${params}`)

  // Handle paginated response
  return {
    projects: (data.content || data || []).map(formatProject),
    pagination: {
      page: data.number || page,
      size: data.size || size,
      totalElements: data.totalElements || 0,
      totalPages: data.totalPages || 0
    }
  }
}

// Get a single project by ID
export async function getProject(id) {
  const data = await apiFetch(`/projects/${id}`)
  return formatProject(data)
}

// Get available tags
export async function getTags() {
  return apiFetch('/tags')
}

// Get game versions
export async function getGameVersions() {
  return apiFetch('/meta/game-versions')
}

// Get classifications
export async function getClassifications() {
  return apiFetch('/meta/classifications')
}

// Format project data for our UI
function formatProject(project) {
  return {
    id: project.id,
    title: project.title || project.name,
    slug: project.slug,
    description: project.description || '',
    about: project.about || '',
    classification: project.classification,
    downloads: project.downloadCount || project.downloads || 0,
    rating: project.rating || 0,
    author: project.author || project.owner?.username || 'Unknown',
    tags: project.tags || [],
    iconUrl: project.imageUrl || project.iconUrl || project.icon || null,
    bannerUrl: project.bannerUrl || project.banner || null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    gameVersions: project.gameVersions || [],
    versions: project.versions || [],
    gallery: project.galleryImages || project.gallery || [],
    repositoryUrl: project.repositoryUrl,
    license: project.license,
    favoriteCount: project.favoriteCount || 0,
    links: project.links || {}
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

// Format rating for display (assuming 0-5 scale)
export function formatRating(rating) {
  return rating ? rating.toFixed(1) : 'N/A'
}

// Get the Modtale page URL for a project
export function getProjectUrl(project) {
  // Modtale uses /mod/{slug} as the URL format
  const slug = project.slug || project.id
  return `https://modtale.net/mod/${slug}`
}

// Get download URL for a specific version
export function getDownloadUrl(projectId, versionNumber) {
  return `${API_BASE}/projects/${projectId}/versions/${versionNumber}/download`
}

// Get the latest version from a project's versions array
export function getLatestVersion(project) {
  if (!project.versions || project.versions.length === 0) return null
  // Sort by date descending and return first
  const sorted = [...project.versions].sort((a, b) =>
    new Date(b.createdAt || b.uploadedAt || 0) - new Date(a.createdAt || a.uploadedAt || 0)
  )
  return sorted[0]
}

// Get download URL for the latest version of a project
export function getLatestDownloadUrl(project) {
  const latest = getLatestVersion(project)
  if (!latest) return null
  return getDownloadUrl(project.id, latest.versionNumber || latest.version || latest.id)
}
