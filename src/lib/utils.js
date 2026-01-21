// Generate URL-friendly slug from title
export function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 60) // Limit length
}

// Generate unique slug with random suffix
export function generateUniqueSlug(title) {
  const base = generateSlug(title)
  const suffix = Math.random().toString(36).substring(2, 8)
  return `${base}-${suffix}`
}

// Format file size for display
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format number with commas
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Validate file type
export function isValidFileType(file, allowedTypes) {
  return allowedTypes.includes(file.type)
}

// Validate file size (in bytes)
export function isValidFileSize(file, maxSize) {
  return file.size <= maxSize
}
