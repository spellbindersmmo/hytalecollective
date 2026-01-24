<script>
  import { auth } from './stores/auth.svelte.js'
  import { getClient, uploadWithRetry } from './supabase.js'
  import { generateUniqueSlug, formatFileSize, isValidFileSize } from './utils.js'
  import Button from './Button.svelte'
  import Panel from './Panel.svelte'

  let { onsuccess = () => {} } = $props()

  // Form state
  let contentType = $state('build') // 'build' | 'world'
  let buildType = $state('prefab') // 'prefab' | 'structure' | 'schematic'
  let title = $state('')
  let description = $state('')
  let selectedTags = $state([])
  let gameVersion = $state('')

  // File state
  let file = $state(null)
  let thumbnail = $state(null)
  let thumbnailPreview = $state(null)

  // Parsed metadata from prefab JSON
  let prefabMetadata = $state(null)

  // UI state
  let loading = $state(false)
  let error = $state(null)
  let uploadProgress = $state(0)
  let dragOver = $state(false)
  let availableTags = $state([])
  let parsingFile = $state(false)

  // File size limits (Supabase free tier has 50MB limit)
  const FILE_LIMITS = {
    build: 50 * 1024 * 1024, // 50MB
    world: 50 * 1024 * 1024 // 50MB (upgrade Supabase for larger)
  }

  const THUMBNAIL_LIMIT = 5 * 1024 * 1024 // 5MB

  const ALLOWED_FILE_TYPES = {
    build: ['application/json', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
    world: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
  }

  // Valid file extensions by build type
  const BUILD_TYPE_EXTENSIONS = {
    prefab: ['.json', '.prefab.json'],
    structure: ['.json', '.zip']
  }

  // Build type options
  const buildTypeOptions = [
    { value: 'prefab', label: 'Prefab', description: 'Hytale prefab JSON file' },
    { value: 'structure', label: 'Structure Pack', description: 'Zipped structure with assets' }
  ]

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  // Fetch available tags on mount
  $effect(() => {
    fetchTags()
  })

  async function fetchTags() {
    const { data, error: err } = await getClient()
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(30)

    if (!err && data) {
      availableTags = data
    }
  }

  function handleFileDrop(e) {
    e.preventDefault()
    dragOver = false

    const droppedFile = e.dataTransfer?.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  function handleFileSelect(e) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  async function validateAndSetFile(selectedFile) {
    error = null
    prefabMetadata = null

    // Check file type based on content type and build type
    const fileName = selectedFile.name.toLowerCase()
    let isValidExtension = false

    if (contentType === 'build') {
      const validExtensions = BUILD_TYPE_EXTENSIONS[buildType]
      isValidExtension = validExtensions.some(ext => fileName.endsWith(ext))

      if (!isValidExtension) {
        const extList = validExtensions.join(', ')
        error = `Invalid file type for ${buildType}. Expected: ${extList}`
        return
      }
    } else {
      // World uploads must be ZIP
      isValidExtension = fileName.endsWith('.zip')
      if (!isValidExtension) {
        error = 'World saves must be uploaded as ZIP files.'
        return
      }
    }

    // Check file size
    const maxSize = FILE_LIMITS[contentType]
    if (!isValidFileSize(selectedFile, maxSize)) {
      error = `File too large. Maximum size is ${formatFileSize(maxSize)}.`
      return
    }

    file = selectedFile

    // Parse JSON prefabs to extract metadata
    if (contentType === 'build' && buildType === 'prefab' && fileName.endsWith('.json')) {
      await parsePrefabJson(selectedFile)
    }
  }

  async function parsePrefabJson(jsonFile) {
    parsingFile = true
    try {
      const text = await jsonFile.text()
      const data = JSON.parse(text)

      // Extract metadata from Hytale prefab format
      // The structure may vary, but we'll try common patterns
      const metadata = {
        valid: true,
        name: data.name || data.prefabName || null,
        dimensions: null,
        blockCount: 0,
        hasEntities: false,
        components: []
      }

      // Try to extract dimensions
      if (data.size) {
        metadata.dimensions = `${data.size.x || data.size[0] || '?'} x ${data.size.y || data.size[1] || '?'} x ${data.size.z || data.size[2] || '?'}`
      } else if (data.dimensions) {
        metadata.dimensions = `${data.dimensions.width || '?'} x ${data.dimensions.height || '?'} x ${data.dimensions.depth || '?'}`
      } else if (data.width && data.height && data.depth) {
        metadata.dimensions = `${data.width} x ${data.height} x ${data.depth}`
      }

      // Try to count blocks
      if (data.blocks && Array.isArray(data.blocks)) {
        metadata.blockCount = data.blocks.length
      } else if (data.palette && data.blockData) {
        // Some formats use palette + block data
        metadata.blockCount = data.blockData.length
      }

      // Check for entities
      if (data.entities && Array.isArray(data.entities)) {
        metadata.hasEntities = data.entities.length > 0
      }

      // Extract components if available
      if (data.components && Array.isArray(data.components)) {
        metadata.components = data.components.map(c => c.type || c.name || 'Unknown').slice(0, 5)
      }

      // Auto-fill title if empty and prefab has a name
      if (!title && metadata.name) {
        title = metadata.name
      }

      prefabMetadata = metadata
    } catch (e) {
      console.error('Error parsing prefab JSON:', e)
      error = 'Invalid JSON file. Please ensure it\'s a valid Hytale prefab.'
      file = null
    } finally {
      parsingFile = false
    }
  }

  function handleThumbnailSelect(e) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetThumbnail(selectedFile)
    }
  }

  function validateAndSetThumbnail(selectedFile) {
    if (!ALLOWED_IMAGE_TYPES.includes(selectedFile.type)) {
      error = 'Invalid image type. Please upload a JPG, PNG, or WebP image.'
      return
    }

    if (!isValidFileSize(selectedFile, THUMBNAIL_LIMIT)) {
      error = `Thumbnail too large. Maximum size is ${formatFileSize(THUMBNAIL_LIMIT)}.`
      return
    }

    thumbnail = selectedFile

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      thumbnailPreview = e.target.result
    }
    reader.readAsDataURL(selectedFile)
  }

  function toggleTag(tag) {
    if (selectedTags.includes(tag.id)) {
      selectedTags = selectedTags.filter(id => id !== tag.id)
    } else if (selectedTags.length < 5) {
      selectedTags = [...selectedTags, tag.id]
    }
  }

  function removeThumbnail() {
    thumbnail = null
    thumbnailPreview = null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    error = null

    if (!auth.isAuthenticated) {
      error = 'You must be logged in to upload.'
      return
    }

    if (!file) {
      error = 'Please select a file to upload.'
      return
    }

    if (!title.trim()) {
      error = 'Please enter a title.'
      return
    }

    loading = true
    uploadProgress = 0

    try {
      // Get client (skip connection check - it can cause more issues than it solves)
      uploadProgress = 5
      const supabase = getClient()

      const userId = auth.user.id
      const slug = generateUniqueSlug(title)
      const timestamp = Date.now()

      // Upload main file
      uploadProgress = 10
      const fileExt = file.name.split('.').pop().toLowerCase()
      const filePath = `${userId}/${slug}-${timestamp}.${fileExt}`

      // Determine content type for upload
      let contentTypeHeader = file.type
      if (fileExt === 'zip') {
        contentTypeHeader = 'application/zip'
      } else if (fileExt === 'json') {
        contentTypeHeader = 'application/json'
      }

      const bucketName = contentType === 'build' ? 'builds' : 'worlds'
      console.log('Uploading file:', { bucketName, filePath, size: file.size, type: contentTypeHeader })

      // Upload main file with automatic retry
      const { data: fileData, error: fileError } = await uploadWithRetry(
        bucketName,
        filePath,
        file,
        { contentType: contentTypeHeader }
      )

      if (fileError) {
        throw new Error(`Upload failed: ${fileError.message}`)
      }

      uploadProgress = 50

      // Upload thumbnail if provided
      let thumbnailPath = null
      if (thumbnail) {
        const thumbExt = thumbnail.name.split('.').pop()
        thumbnailPath = `${userId}/${slug}-thumb-${timestamp}.${thumbExt}`

        const { error: thumbError } = await uploadWithRetry(
          'thumbnails',
          thumbnailPath,
          thumbnail
        )

        if (thumbError) {
          console.warn('Thumbnail upload failed:', thumbError.message)
          // Don't fail the whole upload for thumbnail issues
          thumbnailPath = null
        }
      }
      uploadProgress = 70

      // Create database record
      const table = contentType === 'build' ? 'builds' : 'worlds'
      const record = {
        author_id: userId,
        title: title.trim(),
        slug,
        description: description.trim() || null,
        file_path: filePath,
        file_size: file.size,
        thumbnail_path: thumbnailPath,
        game_version: gameVersion.trim() || null,
        status: 'published'
      }

      if (contentType === 'build') {
        record.content_type = 'build'
        record.build_type = buildType

        // Add parsed metadata if available
        if (prefabMetadata) {
          if (prefabMetadata.blockCount > 0) {
            record.block_count = prefabMetadata.blockCount
          }
          if (prefabMetadata.dimensions) {
            record.dimensions = prefabMetadata.dimensions
          }
        }
      }

      const { data: insertedRecord, error: dbError } = await supabase
        .from(table)
        .insert(record)
        .select()
        .single()

      if (dbError) throw dbError
      uploadProgress = 85

      // Add tags
      if (selectedTags.length > 0) {
        const tagTable = contentType === 'build' ? 'build_tags' : 'world_tags'
        const tagRecords = selectedTags.map(tagId => ({
          [contentType === 'build' ? 'build_id' : 'world_id']: insertedRecord.id,
          tag_id: tagId
        }))

        const { error: tagError } = await supabase
          .from(tagTable)
          .insert(tagRecords)

        if (tagError) console.error('Error adding tags:', tagError)
      }

      uploadProgress = 100

      // Success - reset form
      resetForm()
      onsuccess(insertedRecord)

    } catch (err) {
      console.error('Upload error:', err)
      error = err.message || 'An error occurred during upload.'
    } finally {
      loading = false
    }
  }

  function resetForm() {
    title = ''
    description = ''
    selectedTags = []
    gameVersion = ''
    file = null
    thumbnail = null
    thumbnailPreview = null
    uploadProgress = 0
    prefabMetadata = null
    buildType = 'prefab'
  }

  function removeFile() {
    file = null
    prefabMetadata = null
  }
</script>

<form class="upload-form" onsubmit={handleSubmit}>
  <!-- Content Type Selection -->
  <div class="form-section">
    <label class="section-label">What are you uploading?</label>
    <div class="type-buttons">
      <button
        type="button"
        class="type-btn"
        class:active={contentType === 'build'}
        onclick={() => { contentType = 'build'; file = null; prefabMetadata = null; }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <span>Build / Prefab</span>
        <small>Structures, buildings, objects</small>
      </button>

      <button
        type="button"
        class="type-btn"
        class:active={contentType === 'world'}
        onclick={() => { contentType = 'world'; file = null; prefabMetadata = null; }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span>World / Map</span>
        <small>Full worlds, adventure maps</small>
      </button>
    </div>
  </div>

  <!-- Build Type Selection (only for builds) -->
  {#if contentType === 'build'}
    <div class="form-section">
      <label class="section-label">Build Format</label>
      <div class="build-type-options">
        {#each buildTypeOptions as option}
          <label class="build-type-option" class:selected={buildType === option.value}>
            <input
              type="radio"
              name="buildType"
              value={option.value}
              checked={buildType === option.value}
              onchange={() => { buildType = option.value; file = null; prefabMetadata = null; }}
            />
            <span class="option-label">{option.label}</span>
            <small class="option-desc">{option.description}</small>
          </label>
        {/each}
      </div>
    </div>
  {/if}

  <!-- File Upload -->
  <div class="form-section">
    <label class="section-label">
      {contentType === 'build' ? 'Build File' : 'World File'}
      <span class="required">*</span>
    </label>

    {#if file}
      <div class="file-selected">
        <div class="file-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
          <div>
            <span class="file-name">{file.name}</span>
            <span class="file-size">{formatFileSize(file.size)}</span>
          </div>
        </div>
        <button type="button" class="remove-btn" onclick={removeFile}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Show parsed prefab metadata -->
      {#if parsingFile}
        <div class="metadata-loading">
          <span class="spinner-small"></span>
          Analyzing prefab...
        </div>
      {:else if prefabMetadata}
        <div class="metadata-card">
          <h4>Prefab Information</h4>
          <div class="metadata-grid">
            {#if prefabMetadata.dimensions}
              <div class="metadata-item">
                <span class="meta-label">Dimensions</span>
                <span class="meta-value">{prefabMetadata.dimensions}</span>
              </div>
            {/if}
            {#if prefabMetadata.blockCount > 0}
              <div class="metadata-item">
                <span class="meta-label">Blocks</span>
                <span class="meta-value">{prefabMetadata.blockCount.toLocaleString()}</span>
              </div>
            {/if}
            {#if prefabMetadata.hasEntities}
              <div class="metadata-item">
                <span class="meta-label">Entities</span>
                <span class="meta-value">Yes</span>
              </div>
            {/if}
            {#if prefabMetadata.components.length > 0}
              <div class="metadata-item full-width">
                <span class="meta-label">Components</span>
                <span class="meta-value">{prefabMetadata.components.join(', ')}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {:else}
      <div
        class="dropzone"
        class:drag-over={dragOver}
        ondragover={(e) => { e.preventDefault(); dragOver = true; }}
        ondragleave={() => dragOver = false}
        ondrop={handleFileDrop}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p>Drag and drop your file here, or</p>
        <label class="browse-btn">
          Browse Files
          <input
            type="file"
            accept={contentType === 'build' ? BUILD_TYPE_EXTENSIONS[buildType].join(',') : '.zip'}
            onchange={handleFileSelect}
            hidden
          />
        </label>
        <small>
          {#if contentType === 'build'}
            {BUILD_TYPE_EXTENSIONS[buildType].join(', ')} files up to {formatFileSize(FILE_LIMITS[contentType])}
          {:else}
            ZIP files up to {formatFileSize(FILE_LIMITS[contentType])}
          {/if}
        </small>
      </div>
    {/if}
  </div>

  <!-- Thumbnail Upload -->
  <div class="form-section">
    <label class="section-label">Thumbnail</label>

    {#if thumbnailPreview}
      <div class="thumbnail-preview">
        <img src={thumbnailPreview} alt="Thumbnail preview" />
        <button type="button" class="remove-btn overlay" onclick={removeThumbnail}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    {:else}
      <label class="thumbnail-upload">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>Add thumbnail image</span>
        <small>JPG, PNG, or WebP up to 5MB</small>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onchange={handleThumbnailSelect}
          hidden
        />
      </label>
    {/if}
  </div>

  <!-- Title -->
  <div class="form-section">
    <label class="section-label" for="title">
      Title
      <span class="required">*</span>
    </label>
    <input
      type="text"
      id="title"
      bind:value={title}
      placeholder="Enter a title for your {contentType}"
      maxlength="100"
      required
      disabled={loading}
    />
  </div>

  <!-- Description -->
  <div class="form-section">
    <label class="section-label" for="description">Description</label>
    <textarea
      id="description"
      bind:value={description}
      placeholder="Describe your {contentType}..."
      rows="4"
      maxlength="2000"
      disabled={loading}
    ></textarea>
  </div>

  <!-- Tags -->
  <div class="form-section">
    <label class="section-label">
      Tags
      <small class="tag-count">({selectedTags.length}/5)</small>
    </label>
    <div class="tags-grid">
      {#each availableTags as tag}
        <button
          type="button"
          class="tag-btn"
          class:selected={selectedTags.includes(tag.id)}
          style="--tag-color: {tag.color}"
          onclick={() => toggleTag(tag)}
          disabled={loading || (!selectedTags.includes(tag.id) && selectedTags.length >= 5)}
        >
          {tag.name}
        </button>
      {/each}
    </div>
  </div>

  <!-- Game Version -->
  <div class="form-section">
    <label class="section-label" for="gameVersion">Game Version</label>
    <input
      type="text"
      id="gameVersion"
      bind:value={gameVersion}
      placeholder="e.g., 1.0.0, Early Access"
      maxlength="20"
      disabled={loading}
    />
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <!-- Progress Bar -->
  {#if loading}
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {uploadProgress}%"></div>
      </div>
      <span class="progress-text">{uploadProgress}%</span>
    </div>
  {/if}

  <!-- Submit Button -->
  <div class="form-actions">
    <Button variant="primary" type="submit" disabled={loading || !file || !title.trim()}>
      {#if loading}
        Uploading...
      {:else}
        Upload {contentType === 'build' ? 'Build' : 'World'}
      {/if}
    </Button>
  </div>
</form>

<style>
  .upload-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #c4b8a4;
  }

  .section-label .required {
    color: #c46b6b;
  }

  .section-label small,
  .tag-count {
    font-weight: 400;
    color: #8a7a6a;
  }

  /* Type Selection */
  .type-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 2px solid #3d3428;
    border-radius: 8px;
    color: #a89880;
    cursor: pointer;
    transition: all 0.15s;
  }

  .type-btn:hover {
    background: rgba(60, 50, 40, 0.3);
    border-color: #4a3f32;
    color: #c4b8a4;
  }

  .type-btn.active {
    background: rgba(212, 164, 76, 0.1);
    border-color: #d4a44c;
    color: #f5d898;
  }

  .type-btn svg {
    width: 32px;
    height: 32px;
  }

  .type-btn span {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .type-btn small {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  /* Dropzone */
  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2.5rem 1.5rem;
    background: rgba(0, 0, 0, 0.2);
    border: 2px dashed #4a3f32;
    border-radius: 8px;
    color: #8a7a6a;
    text-align: center;
    transition: all 0.15s;
  }

  .dropzone.drag-over {
    background: rgba(212, 164, 76, 0.1);
    border-color: #d4a44c;
    color: #c4b8a4;
  }

  .dropzone svg {
    width: 40px;
    height: 40px;
    opacity: 0.6;
  }

  .dropzone p {
    margin: 0;
    font-size: 0.9rem;
  }

  .browse-btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: #d4a44c;
    background: rgba(212, 164, 76, 0.15);
    border: 1px solid #d4a44c;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .browse-btn:hover {
    background: rgba(212, 164, 76, 0.25);
  }

  .dropzone small {
    font-size: 0.75rem;
  }

  /* File Selected */
  .file-selected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: rgba(126, 196, 123, 0.1);
    border: 1px solid #7ec47b;
    border-radius: 8px;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .file-info svg {
    width: 24px;
    height: 24px;
    color: #7ec47b;
  }

  .file-name {
    display: block;
    font-weight: 500;
    color: #f0e6d8;
  }

  .file-size {
    font-size: 0.8rem;
    color: #8a7a6a;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(196, 107, 107, 0.2);
    border: none;
    border-radius: 4px;
    color: #c46b6b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .remove-btn:hover {
    background: rgba(196, 107, 107, 0.3);
  }

  .remove-btn svg {
    width: 18px;
    height: 18px;
  }

  /* Thumbnail */
  .thumbnail-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem 1.5rem;
    background: rgba(0, 0, 0, 0.2);
    border: 2px dashed #3d3428;
    border-radius: 8px;
    color: #8a7a6a;
    cursor: pointer;
    transition: all 0.15s;
  }

  .thumbnail-upload:hover {
    background: rgba(60, 50, 40, 0.3);
    border-color: #4a3f32;
  }

  .thumbnail-upload svg {
    width: 32px;
    height: 32px;
    opacity: 0.6;
  }

  .thumbnail-upload small {
    font-size: 0.75rem;
  }

  .thumbnail-preview {
    position: relative;
    width: 100%;
    max-width: 300px;
    aspect-ratio: 16/9;
    border-radius: 8px;
    overflow: hidden;
  }

  .thumbnail-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remove-btn.overlay {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.6);
  }

  /* Form Inputs */
  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    color: #f0e6d8;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  input[type="text"]:focus,
  textarea:focus {
    outline: none;
    border-color: #d4a44c;
    box-shadow: 0 0 0 3px rgba(212, 164, 76, 0.15);
  }

  input::placeholder,
  textarea::placeholder {
    color: #6b5a48;
  }

  input:disabled,
  textarea:disabled {
    opacity: 0.6;
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  /* Tags */
  .tags-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: #a89880;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid #3d3428;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tag-btn:hover:not(:disabled) {
    background: rgba(60, 50, 40, 0.4);
    border-color: var(--tag-color, #4a3f32);
  }

  .tag-btn.selected {
    background: rgba(212, 164, 76, 0.15);
    border-color: var(--tag-color, #d4a44c);
    color: #f5d898;
  }

  .tag-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Error Message */
  .error-message {
    padding: 0.75rem 1rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid #c46b6b;
    border-radius: 6px;
    color: #e8a0a0;
    font-size: 0.85rem;
  }

  /* Progress Bar */
  .progress-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .progress-bar {
    flex: 1;
    height: 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #d4a44c, #e8c36b);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.85rem;
    font-weight: 600;
    color: #d4a44c;
    min-width: 3rem;
    text-align: right;
  }

  /* Actions */
  .form-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 1rem;
    border-top: 1px solid #3d3428;
  }

  /* Build Type Options */
  .build-type-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .build-type-option {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid #3d3428;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    flex: 1;
    min-width: 140px;
  }

  .build-type-option:hover {
    background: rgba(60, 50, 40, 0.3);
    border-color: #4a3f32;
  }

  .build-type-option.selected {
    background: rgba(212, 164, 76, 0.1);
    border-color: #d4a44c;
  }

  .build-type-option input {
    display: none;
  }

  .option-label {
    font-weight: 600;
    color: #c4b8a4;
    font-size: 0.9rem;
  }

  .build-type-option.selected .option-label {
    color: #f5d898;
  }

  .option-desc {
    font-size: 0.75rem;
    color: #8a7a6a;
  }

  /* Metadata Card */
  .metadata-card {
    margin-top: 0.75rem;
    padding: 1rem;
    background: rgba(107, 184, 204, 0.1);
    border: 1px solid rgba(107, 184, 204, 0.3);
    border-radius: 6px;
  }

  .metadata-card h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6bb8cc;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .metadata-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.75rem;
  }

  .metadata-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .metadata-item.full-width {
    grid-column: 1 / -1;
  }

  .meta-label {
    font-size: 0.7rem;
    color: #8a7a6a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meta-value {
    font-size: 0.9rem;
    color: #f0e6d8;
    font-weight: 500;
  }

  .metadata-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    color: #8a7a6a;
    font-size: 0.85rem;
  }

  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid #3d3428;
    border-top-color: #6bb8cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
