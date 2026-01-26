<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { supabase, uploadWithRetry, getStorageUrl } from './supabase.js'
  import { generateUniqueSlug } from './utils.js'

  let { onnavigate = () => {} } = $props()

  // Form state
  let currentStep = $state(1)
  let submitting = $state(false)
  let error = $state(null)

  // Step 1: Classification
  let classification = $state('')

  // Step 2: Basic Info
  let title = $state('')
  let description = $state('')
  let selectedTags = $state([])
  let availableTags = $state([])

  // Step 3: Details
  let about = $state('')
  let repositoryUrl = $state('')
  let discordUrl = $state('')
  let websiteUrl = $state('')
  let license = $state('')

  // Step 4: Media
  let iconFile = $state(null)
  let iconPreview = $state(null)
  let galleryFiles = $state([])
  let galleryPreviews = $state([])

  // Step 5: Files
  let modFile = $state(null)
  let versionNumber = $state('1.0.0')
  let changelog = $state('')
  let gameVersions = $state([])
  let availableGameVersions = $state(['1.0', '0.9', '0.8']) // Placeholder versions

  // File inputs
  let iconInput = $state(null)
  let galleryInput = $state(null)
  let modFileInput = $state(null)

  const classifications = [
    { value: 'PLUGIN', label: 'Server Plugin', description: 'Server-side logic, tools, and scripts', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
    { value: 'DATA', label: 'Data Asset', description: 'Custom data packs and configurations', icon: 'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z' },
    { value: 'ART', label: 'Art Asset', description: 'Custom models, textures, and art', icon: 'M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586' },
    { value: 'MODPACK', label: 'Modpack', description: 'Bundle multiple mods into a pack', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }
  ]

  const licenseOptions = [
    'All Rights Reserved',
    'MIT License',
    'Apache 2.0',
    'GPL v3',
    'Creative Commons (CC BY)',
    'Creative Commons (CC BY-SA)',
    'Creative Commons (CC BY-NC)',
    'Public Domain'
  ]

  onMount(async () => {
    if (!auth.isAuthenticated) {
      auth.openModal()
      return
    }

    // Load available tags
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (data) availableTags = data
  })

  function nextStep() {
    if (currentStep < 5) currentStep++
  }

  function prevStep() {
    if (currentStep > 1) currentStep--
  }

  function canProceed() {
    switch (currentStep) {
      case 1: return classification !== ''
      case 2: return title.trim() !== ''
      case 3: return true // Optional fields
      case 4: return true // Optional fields
      case 5: return modFile !== null && versionNumber.trim() !== ''
      default: return false
    }
  }

  // Icon handling
  function handleIconSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error = 'Icon must be JPEG, PNG, or WebP'
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      error = 'Icon must be less than 2MB'
      return
    }

    iconFile = file
    iconPreview = URL.createObjectURL(file)
    error = null
  }

  function removeIcon() {
    iconFile = null
    if (iconPreview) URL.revokeObjectURL(iconPreview)
    iconPreview = null
    if (iconInput) iconInput.value = ''
  }

  // Gallery handling
  function handleGallerySelect(e) {
    const files = Array.from(e.target.files || [])

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        error = 'Gallery images must be JPEG, PNG, WebP, or GIF'
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        error = 'Gallery images must be less than 5MB each'
        return
      }
    }

    galleryFiles = [...galleryFiles, ...files]
    galleryPreviews = [...galleryPreviews, ...files.map(f => URL.createObjectURL(f))]
    error = null
  }

  function removeGalleryImage(index) {
    URL.revokeObjectURL(galleryPreviews[index])
    galleryFiles = galleryFiles.filter((_, i) => i !== index)
    galleryPreviews = galleryPreviews.filter((_, i) => i !== index)
  }

  // Mod file handling
  function handleModFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['zip', 'jar', 'rar'].includes(ext)) {
      error = 'Mod file must be .zip, .jar, or .rar'
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      error = 'Mod file must be less than 100MB'
      return
    }

    modFile = file
    error = null
  }

  function removeModFile() {
    modFile = null
    if (modFileInput) modFileInput.value = ''
  }

  function toggleTag(tagId) {
    if (selectedTags.includes(tagId)) {
      selectedTags = selectedTags.filter(t => t !== tagId)
    } else if (selectedTags.length < 5) {
      selectedTags = [...selectedTags, tagId]
    }
  }

  function toggleGameVersion(version) {
    if (gameVersions.includes(version)) {
      gameVersions = gameVersions.filter(v => v !== version)
    } else {
      gameVersions = [...gameVersions, version]
    }
  }

  async function handleSubmit() {
    if (!auth.isAuthenticated || submitting) return

    submitting = true
    error = null

    try {
      const slug = generateUniqueSlug(title)
      const timestamp = Date.now()

      // Upload icon
      let iconPath = null
      if (iconFile) {
        const ext = iconFile.name.split('.').pop()
        iconPath = `${auth.user.id}/${slug}/icon-${timestamp}.${ext}`
        await uploadWithRetry('mod-images', iconPath, iconFile)
      }

      // Upload gallery images
      const galleryPaths = []
      for (let i = 0; i < galleryFiles.length; i++) {
        const file = galleryFiles[i]
        const ext = file.name.split('.').pop()
        const path = `${auth.user.id}/${slug}/gallery-${timestamp}-${i}.${ext}`
        await uploadWithRetry('mod-images', path, file)
        galleryPaths.push(path)
      }

      // Upload mod file
      const modExt = modFile.name.split('.').pop()
      const modFilePath = `${auth.user.id}/${slug}/${slug}-v${versionNumber}.${modExt}`
      await uploadWithRetry('mods', modFilePath, modFile)

      // Create mod record
      const { data: mod, error: modError } = await supabase
        .from('mods')
        .insert({
          author_id: auth.user.id,
          title: title.trim(),
          slug,
          description: description.trim() || null,
          about: about.trim() || null,
          classification,
          status: 'published',
          icon_path: iconPath,
          repository_url: repositoryUrl.trim() || null,
          discord_url: discordUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
          license: license || null,
          published_at: new Date().toISOString()
        })
        .select()
        .single()

      if (modError) throw modError

      // Create version record
      const { error: versionError } = await supabase
        .from('mod_versions')
        .insert({
          mod_id: mod.id,
          version_number: versionNumber.trim(),
          changelog: changelog.trim() || null,
          file_path: modFilePath,
          file_size: modFile.size,
          game_versions: gameVersions
        })

      if (versionError) throw versionError

      // Create tag associations
      if (selectedTags.length > 0) {
        const tagRecords = selectedTags.map(tagId => ({
          mod_id: mod.id,
          tag_id: tagId
        }))
        await supabase.from('mod_tags').insert(tagRecords)
      }

      // Create gallery records
      for (let i = 0; i < galleryPaths.length; i++) {
        await supabase.from('mod_gallery').insert({
          mod_id: mod.id,
          image_path: galleryPaths[i],
          sort_order: i
        })
      }

      // Navigate to the new mod page
      onnavigate(`mod-local-${slug}`)
    } catch (e) {
      console.error('Error creating mod:', e)
      error = e.message || 'Failed to create mod'
    } finally {
      submitting = false
    }
  }
</script>

<div class="page">
  <Navbar currentPage="mods" {onnavigate} />

  <main class="main">
    <div class="container">
      <div class="page-header">
        <button class="back-link" onclick={() => onnavigate('mods')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Mods
        </button>
        <h1 class="page-title">Upload Mod</h1>
      </div>

      {#if !auth.isAuthenticated}
        <Panel>
          <div class="auth-prompt">
            <p>You must be logged in to upload mods.</p>
            <Button variant="primary" onclick={() => auth.openModal()}>
              Login
            </Button>
          </div>
        </Panel>
      {:else}
        <!-- Progress Steps -->
        <div class="progress-steps">
          {#each [1, 2, 3, 4, 5] as step}
            <button
              class="step"
              class:active={currentStep === step}
              class:completed={currentStep > step}
              onclick={() => { if (step < currentStep) currentStep = step }}
              disabled={step > currentStep}
            >
              <span class="step-number">{step}</span>
              <span class="step-label">
                {#if step === 1}Type
                {:else if step === 2}Info
                {:else if step === 3}Details
                {:else if step === 4}Media
                {:else}Files
                {/if}
              </span>
            </button>
            {#if step < 5}
              <div class="step-connector" class:completed={currentStep > step}></div>
            {/if}
          {/each}
        </div>

        <Panel>
          <div class="form-container">
            {#if error}
              <div class="error-message">{error}</div>
            {/if}

            <!-- Step 1: Classification -->
            {#if currentStep === 1}
              <div class="step-content">
                <h2 class="step-title">What are you creating?</h2>
                <p class="step-description">Select the type of content you want to upload.</p>

                <div class="classification-grid">
                  {#each classifications as cls}
                    <button
                      class="classification-card"
                      class:selected={classification === cls.value}
                      onclick={() => classification = cls.value}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d={cls.icon} />
                      </svg>
                      <h3>{cls.label}</h3>
                      <p>{cls.description}</p>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Step 2: Basic Info -->
            {#if currentStep === 2}
              <div class="step-content">
                <h2 class="step-title">Basic Information</h2>
                <p class="step-description">Tell us about your mod.</p>

                <div class="form-group">
                  <label for="title">Title <span class="required">*</span></label>
                  <input
                    type="text"
                    id="title"
                    bind:value={title}
                    placeholder="My Awesome Mod"
                    maxlength="100"
                  />
                </div>

                <div class="form-group">
                  <label for="description">Short Description</label>
                  <textarea
                    id="description"
                    bind:value={description}
                    placeholder="A brief description of your mod..."
                    rows="3"
                    maxlength="500"
                  ></textarea>
                  <span class="char-count">{description.length}/500</span>
                </div>

                <div class="form-group">
                  <label>Tags <span class="optional">(up to 5)</span></label>
                  <div class="tags-grid">
                    {#each availableTags as tag}
                      <button
                        class="tag-btn"
                        class:selected={selectedTags.includes(tag.id)}
                        onclick={() => toggleTag(tag.id)}
                        disabled={!selectedTags.includes(tag.id) && selectedTags.length >= 5}
                      >
                        {tag.name}
                      </button>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}

            <!-- Step 3: Details -->
            {#if currentStep === 3}
              <div class="step-content">
                <h2 class="step-title">Details</h2>
                <p class="step-description">Add more details about your mod. These are optional but help users understand your mod better.</p>

                <div class="form-group">
                  <label for="about">Full Description <span class="optional">(Markdown supported)</span></label>
                  <textarea
                    id="about"
                    bind:value={about}
                    placeholder="Describe your mod in detail. You can use Markdown formatting..."
                    rows="10"
                  ></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="repository">Repository URL</label>
                    <input
                      type="url"
                      id="repository"
                      bind:value={repositoryUrl}
                      placeholder="https://github.com/..."
                    />
                  </div>

                  <div class="form-group">
                    <label for="discord">Discord URL</label>
                    <input
                      type="url"
                      id="discord"
                      bind:value={discordUrl}
                      placeholder="https://discord.gg/..."
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="website">Website URL</label>
                    <input
                      type="url"
                      id="website"
                      bind:value={websiteUrl}
                      placeholder="https://..."
                    />
                  </div>

                  <div class="form-group">
                    <label for="license">License</label>
                    <select id="license" bind:value={license}>
                      <option value="">Select a license...</option>
                      {#each licenseOptions as lic}
                        <option value={lic}>{lic}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Step 4: Media -->
            {#if currentStep === 4}
              <div class="step-content">
                <h2 class="step-title">Media</h2>
                <p class="step-description">Add images to showcase your mod.</p>

                <div class="form-group">
                  <label>Icon</label>
                  <div class="icon-upload">
                    {#if iconPreview}
                      <div class="icon-preview">
                        <img src={iconPreview} alt="Icon preview" />
                        <button class="remove-btn" onclick={removeIcon}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    {:else}
                      <button class="upload-btn" onclick={() => iconInput?.click()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>Upload Icon</span>
                        <small>512x512px recommended</small>
                      </button>
                    {/if}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      bind:this={iconInput}
                      onchange={handleIconSelect}
                      hidden
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label>Gallery Images</label>
                  <div class="gallery-upload">
                    <div class="gallery-grid">
                      {#each galleryPreviews as preview, index}
                        <div class="gallery-item">
                          <img src={preview} alt="Gallery preview" />
                          <button class="remove-btn" onclick={() => removeGalleryImage(index)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      {/each}
                      <button class="add-gallery-btn" onclick={() => galleryInput?.click()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Add Images</span>
                      </button>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      bind:this={galleryInput}
                      onchange={handleGallerySelect}
                      hidden
                    />
                  </div>
                </div>
              </div>
            {/if}

            <!-- Step 5: Files -->
            {#if currentStep === 5}
              <div class="step-content">
                <h2 class="step-title">Upload Files</h2>
                <p class="step-description">Upload your mod file and set the version information.</p>

                <div class="form-group">
                  <label>Mod File <span class="required">*</span></label>
                  {#if modFile}
                    <div class="file-selected">
                      <div class="file-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <div>
                          <span class="file-name">{modFile.name}</span>
                          <span class="file-size">{(modFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <button class="remove-file-btn" onclick={removeModFile}>Remove</button>
                    </div>
                  {:else}
                    <button class="file-upload-btn" onclick={() => modFileInput?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Choose File</span>
                      <small>.zip, .jar, or .rar (max 100MB)</small>
                    </button>
                  {/if}
                  <input
                    type="file"
                    accept=".zip,.jar,.rar"
                    bind:this={modFileInput}
                    onchange={handleModFileSelect}
                    hidden
                  />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="version">Version Number <span class="required">*</span></label>
                    <input
                      type="text"
                      id="version"
                      bind:value={versionNumber}
                      placeholder="1.0.0"
                    />
                  </div>

                  <div class="form-group">
                    <label>Game Versions</label>
                    <div class="version-tags">
                      {#each availableGameVersions as ver}
                        <button
                          class="version-tag"
                          class:selected={gameVersions.includes(ver)}
                          onclick={() => toggleGameVersion(ver)}
                        >
                          {ver}
                        </button>
                      {/each}
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label for="changelog">Changelog</label>
                  <textarea
                    id="changelog"
                    bind:value={changelog}
                    placeholder="What's new in this version..."
                    rows="4"
                  ></textarea>
                </div>
              </div>
            {/if}

            <!-- Navigation -->
            <div class="form-actions">
              {#if currentStep > 1}
                <Button variant="secondary" onclick={prevStep} disabled={submitting}>
                  Back
                </Button>
              {:else}
                <div></div>
              {/if}

              {#if currentStep < 5}
                <Button variant="primary" onclick={nextStep} disabled={!canProceed()}>
                  Continue
                </Button>
              {:else}
                <Button variant="primary" onclick={handleSubmit} disabled={!canProceed() || submitting}>
                  {submitting ? 'Uploading...' : 'Publish Mod'}
                </Button>
              {/if}
            </div>
          </div>
        </Panel>
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
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    background: none;
    border: none;
    color: #d4a44c;
    font-size: 0.9rem;
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .back-link svg {
    width: 18px;
    height: 18px;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .auth-prompt {
    text-align: center;
    padding: 2rem;
    color: #8a7a6a;
  }

  .auth-prompt p {
    margin: 0 0 1rem 0;
  }

  /* Progress Steps */
  .progress-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
    padding: 0 1rem;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
  }

  .step:disabled {
    cursor: not-allowed;
  }

  .step-number {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 2px solid #4a3f32;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    color: #8a7a6a;
    transition: all 0.15s;
  }

  .step.active .step-number {
    background: linear-gradient(180deg, #d4a44c 0%, #a67c28 100%);
    border-color: #d4a44c;
    color: #1a1208;
  }

  .step.completed .step-number {
    background: linear-gradient(180deg, #3a5a3a 0%, #2d4a2d 100%);
    border-color: #4a6a4a;
    color: #b8e0b8;
  }

  .step-label {
    font-size: 0.75rem;
    color: #6a5a4a;
  }

  .step.active .step-label {
    color: #d4a44c;
  }

  .step-connector {
    flex: 1;
    max-width: 60px;
    height: 2px;
    background: #3d3428;
    margin: 0 0.25rem;
    margin-bottom: 1.5rem;
  }

  .step-connector.completed {
    background: #4a6a4a;
  }

  /* Form Container */
  .form-container {
    padding: 0.5rem;
  }

  .step-content {
    min-height: 300px;
  }

  .step-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0 0 0.5rem 0;
  }

  .step-description {
    color: #8a7a6a;
    margin: 0 0 1.5rem 0;
  }

  /* Classification Grid */
  .classification-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .classification-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem 1rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 2px solid #3d3428;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }

  .classification-card:hover {
    border-color: #4a3f32;
    background: linear-gradient(180deg, #302820 0%, #282218 100%);
  }

  .classification-card.selected {
    border-color: #d4a44c;
    background: linear-gradient(180deg, rgba(212, 164, 76, 0.1) 0%, rgba(166, 124, 40, 0.1) 100%);
  }

  .classification-card svg {
    width: 32px;
    height: 32px;
    color: #8a7a6a;
  }

  .classification-card.selected svg {
    color: #d4a44c;
  }

  .classification-card h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #f0e6d8;
    margin: 0;
  }

  .classification-card p {
    font-size: 0.8rem;
    color: #8a7a6a;
    margin: 0;
  }

  /* Form Groups */
  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    font-size: 0.9rem;
    font-weight: 500;
    color: #c4b8a4;
    margin-bottom: 0.5rem;
  }

  .required {
    color: #c46b6b;
  }

  .optional {
    color: #6a5a4a;
    font-weight: 400;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    color: #f0e6d8;
    font-size: 0.95rem;
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: #d4a44c;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 100px;
  }

  .char-count {
    display: block;
    text-align: right;
    font-size: 0.75rem;
    color: #6a5a4a;
    margin-top: 0.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  /* Tags */
  .tags-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-btn {
    padding: 0.4rem 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 20px;
    color: #c4b8a4;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .tag-btn:hover:not(:disabled) {
    border-color: #6b5a48;
  }

  .tag-btn.selected {
    background: rgba(212, 164, 76, 0.2);
    border-color: #d4a44c;
    color: #d4a44c;
  }

  .tag-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Icon Upload */
  .icon-upload {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .icon-preview {
    position: relative;
    width: 128px;
    height: 128px;
  }

  .icon-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #4a3f32;
  }

  .remove-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    background: #c46b6b;
    border: none;
    border-radius: 50%;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-btn svg {
    width: 14px;
    height: 14px;
  }

  .upload-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
    background: rgba(0, 0, 0, 0.2);
    border: 2px dashed #4a3f32;
    border-radius: 8px;
    cursor: pointer;
    color: #8a7a6a;
    transition: all 0.15s;
  }

  .upload-btn:hover {
    border-color: #d4a44c;
    color: #c4b8a4;
  }

  .upload-btn svg {
    width: 32px;
    height: 32px;
  }

  .upload-btn small {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  /* Gallery Upload */
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }

  .gallery-item {
    position: relative;
    aspect-ratio: 16/9;
  }

  .gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #4a3f32;
  }

  .add-gallery-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    aspect-ratio: 16/9;
    background: rgba(0, 0, 0, 0.2);
    border: 2px dashed #4a3f32;
    border-radius: 6px;
    cursor: pointer;
    color: #8a7a6a;
    transition: all 0.15s;
  }

  .add-gallery-btn:hover {
    border-color: #d4a44c;
    color: #c4b8a4;
  }

  .add-gallery-btn svg {
    width: 24px;
    height: 24px;
  }

  .add-gallery-btn span {
    font-size: 0.8rem;
  }

  /* File Upload */
  .file-upload-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 2rem;
    background: rgba(0, 0, 0, 0.2);
    border: 2px dashed #4a3f32;
    border-radius: 8px;
    cursor: pointer;
    color: #8a7a6a;
    transition: all 0.15s;
  }

  .file-upload-btn:hover {
    border-color: #d4a44c;
    color: #c4b8a4;
  }

  .file-upload-btn svg {
    width: 40px;
    height: 40px;
  }

  .file-upload-btn small {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .file-selected {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid #4a3f32;
    border-radius: 8px;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .file-info svg {
    width: 32px;
    height: 32px;
    color: #6bb8cc;
  }

  .file-name {
    display: block;
    font-weight: 500;
    color: #f0e6d8;
  }

  .file-size {
    display: block;
    font-size: 0.8rem;
    color: #8a7a6a;
  }

  .remove-file-btn {
    padding: 0.5rem 1rem;
    background: rgba(196, 107, 107, 0.2);
    border: 1px solid #c46b6b;
    border-radius: 4px;
    color: #e8a0a0;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .remove-file-btn:hover {
    background: rgba(196, 107, 107, 0.3);
  }

  /* Version Tags */
  .version-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .version-tag {
    padding: 0.4rem 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #c4b8a4;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .version-tag:hover {
    border-color: #6b5a48;
  }

  .version-tag.selected {
    background: rgba(107, 184, 204, 0.2);
    border-color: #6bb8cc;
    color: #6bb8cc;
  }

  /* Error Message */
  .error-message {
    padding: 0.75rem 1rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid #c46b6b;
    border-radius: 6px;
    color: #e8a0a0;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  /* Form Actions */
  .form-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #3d3428;
  }
</style>
