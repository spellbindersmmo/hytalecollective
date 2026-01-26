<script>
  import { marked } from 'marked'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'
  import { fetchLocalModBySlug, updateLocalMod, deleteLocalMod, createModVersion, deleteModVersion, addModDependency, removeModDependency, searchLocalMods } from './stores/data.svelte.js'
  import { supabase, getStorageUrl } from './supabase.js'
  import { searchProjects, classificationOptions } from './modtale.js'

  marked.setOptions({ breaks: true, gfm: true })

  let { modSlug = '', onnavigate = () => {} } = $props()

  // State
  let mod = $state(null)
  let loading = $state(true)
  let error = $state(null)
  let saving = $state(false)
  let activeTab = $state('details')

  // Edit states
  let editTitle = $state('')
  let editDescription = $state('')
  let editAbout = $state('')
  let editChangelog = $state('')
  let editStatus = $state('draft')
  let editSourceType = $state('')
  let editRepositoryUrl = $state('')
  let editDiscordUrl = $state('')
  let editWebsiteUrl = $state('')
  let editLicense = $state('')

  // Version form
  let showVersionForm = $state(false)
  let newVersionNumber = $state('')
  let newVersionChangelog = $state('')
  let newVersionFile = $state(null)
  let newVersionGameVersions = $state('')
  let uploadingVersion = $state(false)
  let versionUploadProgress = $state(0)

  // Gallery
  let uploadingGallery = $state(false)
  let uploadingIcon = $state(false)

  // Dependencies
  let showDependencyForm = $state(false)
  let dependencySearch = $state('')
  let dependencySearchResults = $state([])
  let searchingDependencies = $state(false)
  let selectedDependencyType = $state('required')
  let addingDependency = $state(false)

  // Markdown editor state
  let aboutPreview = $state(false)
  let changelogPreview = $state(false)
  let aboutTextarea = $state(null)
  let changelogTextarea = $state(null)

  // Markdown formatting helpers
  function insertMarkdown(textarea, valueSetter, currentValue, prefix, suffix = '', placeholder = '') {
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = currentValue.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newValue = currentValue.substring(0, start) + prefix + textToInsert + suffix + currentValue.substring(end)
    valueSetter(newValue)

    // Restore focus and selection after state update
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length + textToInsert.length + suffix.length
      textarea.setSelectionRange(
        selectedText ? newCursorPos : start + prefix.length,
        selectedText ? newCursorPos : start + prefix.length + placeholder.length
      )
    }, 0)
  }

  function formatAbout(type) {
    const formats = {
      bold: { prefix: '**', suffix: '**', placeholder: 'bold text' },
      italic: { prefix: '_', suffix: '_', placeholder: 'italic text' },
      heading: { prefix: '## ', suffix: '', placeholder: 'Heading' },
      link: { prefix: '[', suffix: '](url)', placeholder: 'link text' },
      list: { prefix: '- ', suffix: '', placeholder: 'list item' },
      code: { prefix: '`', suffix: '`', placeholder: 'code' },
      codeblock: { prefix: '```\n', suffix: '\n```', placeholder: 'code block' },
      quote: { prefix: '> ', suffix: '', placeholder: 'quote' }
    }
    const fmt = formats[type]
    if (fmt) {
      insertMarkdown(aboutTextarea, (v) => editAbout = v, editAbout, fmt.prefix, fmt.suffix, fmt.placeholder)
    }
  }

  function formatChangelog(type) {
    const formats = {
      bold: { prefix: '**', suffix: '**', placeholder: 'bold text' },
      italic: { prefix: '_', suffix: '_', placeholder: 'italic text' },
      heading: { prefix: '## ', suffix: '', placeholder: 'Heading' },
      link: { prefix: '[', suffix: '](url)', placeholder: 'link text' },
      list: { prefix: '- ', suffix: '', placeholder: 'list item' },
      code: { prefix: '`', suffix: '`', placeholder: 'code' },
      quote: { prefix: '> ', suffix: '', placeholder: 'quote' }
    }
    const fmt = formats[type]
    if (fmt) {
      insertMarkdown(changelogTextarea, (v) => editChangelog = v, editChangelog, fmt.prefix, fmt.suffix, fmt.placeholder)
    }
  }

  $effect(() => {
    if (modSlug) {
      loadMod()
    }
  })

  async function loadMod() {
    loading = true
    error = null

    try {
      mod = await fetchLocalModBySlug(modSlug)

      // Check ownership
      if (mod.authorId !== auth.user?.id) {
        error = 'You do not have permission to edit this mod'
        return
      }

      // Populate edit fields
      editTitle = mod.title || ''
      editDescription = mod.description || ''
      editAbout = mod.about || ''
      editChangelog = mod.changelog || ''
      editStatus = mod.status || 'draft'
      editSourceType = mod.sourceType || ''
      editRepositoryUrl = mod.repositoryUrl || ''
      editDiscordUrl = mod.discordUrl || ''
      editWebsiteUrl = mod.websiteUrl || ''
      editLicense = mod.license || ''
    } catch (e) {
      console.error('Error loading mod:', e)
      error = 'Failed to load mod'
    } finally {
      loading = false
    }
  }

  async function saveDetails() {
    if (saving) return
    saving = true

    try {
      await updateLocalMod(mod.id, {
        title: editTitle,
        description: editDescription,
        about: editAbout,
        changelog: editChangelog,
        status: editStatus,
        source_type: editSourceType || null,
        repository_url: editRepositoryUrl || null,
        discord_url: editDiscordUrl || null,
        website_url: editWebsiteUrl || null,
        license: editLicense || null
      })

      // Update local mod state
      mod.title = editTitle
      mod.description = editDescription
      mod.about = editAbout
      mod.changelog = editChangelog
      mod.status = editStatus
      mod.sourceType = editSourceType
      mod.repositoryUrl = editRepositoryUrl
      mod.discordUrl = editDiscordUrl
      mod.websiteUrl = editWebsiteUrl
      mod.license = editLicense

      alert('Changes saved successfully!')
    } catch (e) {
      console.error('Error saving:', e)
      alert('Failed to save changes')
    } finally {
      saving = false
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this mod? This cannot be undone.')) return

    try {
      await deleteLocalMod(mod.id)
      onnavigate('mods')
    } catch (e) {
      console.error('Error deleting mod:', e)
      alert('Failed to delete mod')
    }
  }

  async function uploadNewIcon(e) {
    const file = e.target.files?.[0]
    if (!file || uploadingIcon) return
    uploadingIcon = true

    try {
      const cleanSlug = mod.slug.startsWith('local-') ? mod.slug.slice(6) : mod.slug
      const fileName = `${auth.user.id}/${cleanSlug}/icon-${Date.now()}-${file.name}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mod-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      await updateLocalMod(mod.id, { icon_path: uploadData.path })
      mod.iconUrl = getStorageUrl('mod-images', uploadData.path)
    } catch (e) {
      console.error('Error uploading icon:', e)
      alert('Failed to upload icon: ' + e.message)
    } finally {
      uploadingIcon = false
      e.target.value = ''
    }
  }

  async function uploadNewVersion() {
    if (!newVersionFile || !newVersionNumber || uploadingVersion) return
    uploadingVersion = true
    versionUploadProgress = 0

    try {
      const cleanSlug = mod.slug.startsWith('local-') ? mod.slug.slice(6) : mod.slug
      const fileName = `${auth.user.id}/${cleanSlug}/${newVersionNumber}-${newVersionFile.name}`

      versionUploadProgress = 20
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mods')
        .upload(fileName, newVersionFile)

      if (uploadError) throw uploadError
      versionUploadProgress = 70

      const gameVersionsArray = newVersionGameVersions
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)

      const versionData = {
        version_number: newVersionNumber,
        changelog: newVersionChangelog || null,
        file_path: uploadData.path,
        file_size: newVersionFile.size,
        game_versions: gameVersionsArray
      }

      const newVersion = await createModVersion(mod.id, versionData)
      versionUploadProgress = 100

      mod.versions = [
        {
          id: newVersion.id,
          versionNumber: newVersion.version_number,
          changelog: newVersion.changelog,
          filePath: newVersion.file_path,
          fileSize: newVersion.file_size,
          gameVersions: newVersion.game_versions || [],
          createdAt: newVersion.created_at,
          downloadUrl: getStorageUrl('mods', newVersion.file_path)
        },
        ...mod.versions
      ]

      showVersionForm = false
      newVersionNumber = ''
      newVersionChangelog = ''
      newVersionFile = null
      newVersionGameVersions = ''
    } catch (e) {
      console.error('Error uploading version:', e)
      alert('Failed to upload version: ' + e.message)
    } finally {
      uploadingVersion = false
      versionUploadProgress = 0
    }
  }

  async function handleDeleteVersion(version) {
    if (!confirm(`Delete version ${version.versionNumber}? This cannot be undone.`)) return

    try {
      await deleteModVersion(version.id, version.filePath)
      mod.versions = mod.versions.filter(v => v.id !== version.id)
    } catch (e) {
      console.error('Error deleting version:', e)
      alert('Failed to delete version')
    }
  }

  async function uploadGalleryImage(e) {
    const file = e.target.files?.[0]
    if (!file || uploadingGallery) return
    uploadingGallery = true

    try {
      const cleanSlug = mod.slug.startsWith('local-') ? mod.slug.slice(6) : mod.slug
      const fileName = `${auth.user.id}/${cleanSlug}/gallery-${Date.now()}-${file.name}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mod-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: galleryRecord, error: galleryError } = await supabase
        .from('mod_gallery')
        .insert({
          mod_id: mod.id,
          image_path: uploadData.path,
          sort_order: mod.gallery?.length || 0
        })
        .select()
        .single()

      if (galleryError) throw galleryError

      mod.gallery = [
        ...(mod.gallery || []),
        { id: galleryRecord.id, url: getStorageUrl('mod-images', uploadData.path) }
      ]
    } catch (e) {
      console.error('Error uploading gallery image:', e)
      alert('Failed to upload image: ' + e.message)
    } finally {
      uploadingGallery = false
      e.target.value = ''
    }
  }

  async function deleteGalleryImage(image) {
    if (!confirm('Delete this gallery image?')) return

    try {
      const { data: record } = await supabase
        .from('mod_gallery')
        .select('image_path')
        .eq('id', image.id)
        .single()

      if (record?.image_path) {
        await supabase.storage.from('mod-images').remove([record.image_path])
      }

      await supabase.from('mod_gallery').delete().eq('id', image.id)
      mod.gallery = mod.gallery.filter(g => g.id !== image.id)
    } catch (e) {
      console.error('Error deleting gallery image:', e)
      alert('Failed to delete image')
    }
  }

  // Dependency functions
  let searchTimeout = null
  async function handleDependencySearch(e) {
    const query = e.target.value
    dependencySearch = query

    if (searchTimeout) clearTimeout(searchTimeout)

    if (query.length < 2) {
      dependencySearchResults = []
      return
    }

    searchTimeout = setTimeout(async () => {
      searchingDependencies = true
      try {
        const [localResults, modtaleResults] = await Promise.all([
          searchLocalMods(query),
          searchProjects({ search: query, size: 5 }).catch(() => ({ projects: [] }))
        ])

        const existingDeps = mod.dependencies?.map(d => d.slug) || []
        const currentSlug = mod.slug

        const combined = [
          ...localResults.filter(m => m.slug !== currentSlug && !existingDeps.includes(m.slug)),
          ...(modtaleResults.projects || []).map(m => ({
            id: m.id,
            title: m.title,
            slug: m.slug,
            iconUrl: m.iconUrl,
            isLocal: false
          })).filter(m => !existingDeps.includes(m.slug))
        ]

        dependencySearchResults = combined.slice(0, 8)
      } catch (e) {
        console.error('Error searching dependencies:', e)
      } finally {
        searchingDependencies = false
      }
    }, 300)
  }

  async function handleAddDependency(depMod) {
    if (addingDependency) return
    addingDependency = true

    try {
      const depData = {
        type: selectedDependencyType,
        isLocal: depMod.isLocal,
        slug: depMod.slug,
        title: depMod.title
      }

      if (depMod.isLocal) {
        depData.localModId = depMod.id
      }

      const newDep = await addModDependency(mod.id, depData)

      mod.dependencies = [
        ...(mod.dependencies || []),
        {
          id: newDep.id,
          type: selectedDependencyType,
          isLocal: depMod.isLocal,
          slug: depMod.slug,
          title: depMod.title,
          iconUrl: depMod.iconUrl
        }
      ]

      dependencySearch = ''
      dependencySearchResults = []
      showDependencyForm = false
    } catch (e) {
      console.error('Error adding dependency:', e)
      alert('Failed to add dependency')
    } finally {
      addingDependency = false
    }
  }

  async function handleRemoveDependency(dep) {
    if (!confirm(`Remove ${dep.title} as a dependency?`)) return

    try {
      await removeModDependency(dep.id)
      mod.dependencies = mod.dependencies.filter(d => d.id !== dep.id)
    } catch (e) {
      console.error('Error removing dependency:', e)
      alert('Failed to remove dependency')
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatDate(dateString) {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
</script>

<div class="page">
  <Navbar currentPage="mods" {onnavigate} />

  <main class="main">
    <div class="container">
      <button class="back-link" onclick={() => onnavigate(`mod-${modSlug}`)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Mod
      </button>

      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      {:else if error}
        <Panel>
          <div class="error-state">
            <h3>Error</h3>
            <p>{error}</p>
            <Button variant="primary" onclick={() => onnavigate('mods')}>Back to Mods</Button>
          </div>
        </Panel>
      {:else if mod}
        <div class="edit-header">
          <div class="edit-header-info">
            {#if mod.iconUrl}
              <img src={mod.iconUrl} alt={mod.title} class="edit-icon" />
            {/if}
            <div>
              <h1 class="edit-title">Edit: {mod.title}</h1>
              <span class="status-badge status-{mod.status}">{mod.status}</span>
            </div>
          </div>
          <div class="edit-header-actions">
            <Button variant="primary" onclick={saveDetails} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab" class:active={activeTab === 'details'} onclick={() => activeTab = 'details'}>
            Details
          </button>
          <button class="tab" class:active={activeTab === 'media'} onclick={() => activeTab = 'media'}>
            Media
          </button>
          <button class="tab" class:active={activeTab === 'versions'} onclick={() => activeTab = 'versions'}>
            Versions
          </button>
          <button class="tab" class:active={activeTab === 'dependencies'} onclick={() => activeTab = 'dependencies'}>
            Dependencies
          </button>
          <button class="tab tab-danger" class:active={activeTab === 'danger'} onclick={() => activeTab = 'danger'}>
            Danger Zone
          </button>
        </div>

        <!-- Details Tab -->
        {#if activeTab === 'details'}
          <div class="tab-content">
            <div class="form-grid">
              <Panel>
                <div class="form-section">
                  <h3 class="section-title">Basic Information</h3>

                  <div class="form-group">
                    <label class="form-label">Status</label>
                    <select bind:value={editStatus} class="form-select">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                    <p class="form-help">Draft mods are only visible to you. Published mods are visible to everyone.</p>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Title</label>
                    <input type="text" bind:value={editTitle} class="form-input" placeholder="Mod title" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Short Description</label>
                    <textarea bind:value={editDescription} class="form-textarea" rows="3" placeholder="Brief description shown in listings"></textarea>
                  </div>

                  <div class="form-group">
                    <div class="markdown-header">
                      <label class="form-label">Full Description (Markdown)</label>
                      <button
                        type="button"
                        class="preview-toggle"
                        class:active={aboutPreview}
                        onclick={() => aboutPreview = !aboutPreview}
                      >
                        {aboutPreview ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                    {#if aboutPreview}
                      <div class="markdown-preview tall">
                        {#if editAbout}
                          {@html marked(editAbout)}
                        {:else}
                          <p class="preview-placeholder">Nothing to preview</p>
                        {/if}
                      </div>
                    {:else}
                      <div class="markdown-toolbar">
                        <button type="button" onclick={() => formatAbout('bold')} title="Bold">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
                        </button>
                        <button type="button" onclick={() => formatAbout('italic')} title="Italic">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                        </button>
                        <span class="toolbar-divider"></span>
                        <button type="button" onclick={() => formatAbout('heading')} title="Heading">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M6 12h12"/></svg>
                        </button>
                        <button type="button" onclick={() => formatAbout('list')} title="List">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                        </button>
                        <button type="button" onclick={() => formatAbout('quote')} title="Quote">
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
                        </button>
                        <span class="toolbar-divider"></span>
                        <button type="button" onclick={() => formatAbout('link')} title="Link">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </button>
                        <button type="button" onclick={() => formatAbout('code')} title="Inline Code">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        </button>
                        <button type="button" onclick={() => formatAbout('codeblock')} title="Code Block">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10l4 4-4 4"/><line x1="14" y1="18" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                      <textarea
                        bind:value={editAbout}
                        bind:this={aboutTextarea}
                        class="form-textarea tall"
                        rows="10"
                        placeholder="Detailed description with markdown support"
                      ></textarea>
                    {/if}
                  </div>

                  <div class="form-group">
                    <div class="markdown-header">
                      <label class="form-label">Changelog (Markdown)</label>
                      <button
                        type="button"
                        class="preview-toggle"
                        class:active={changelogPreview}
                        onclick={() => changelogPreview = !changelogPreview}
                      >
                        {changelogPreview ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                    {#if changelogPreview}
                      <div class="markdown-preview">
                        {#if editChangelog}
                          {@html marked(editChangelog)}
                        {:else}
                          <p class="preview-placeholder">Nothing to preview</p>
                        {/if}
                      </div>
                    {:else}
                      <div class="markdown-toolbar">
                        <button type="button" onclick={() => formatChangelog('bold')} title="Bold">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
                        </button>
                        <button type="button" onclick={() => formatChangelog('italic')} title="Italic">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                        </button>
                        <span class="toolbar-divider"></span>
                        <button type="button" onclick={() => formatChangelog('heading')} title="Heading">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M6 12h12"/></svg>
                        </button>
                        <button type="button" onclick={() => formatChangelog('list')} title="List">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                        </button>
                        <button type="button" onclick={() => formatChangelog('quote')} title="Quote">
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
                        </button>
                        <span class="toolbar-divider"></span>
                        <button type="button" onclick={() => formatChangelog('link')} title="Link">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        </button>
                        <button type="button" onclick={() => formatChangelog('code')} title="Inline Code">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                        </button>
                      </div>
                      <textarea
                        bind:value={editChangelog}
                        bind:this={changelogTextarea}
                        class="form-textarea"
                        rows="6"
                        placeholder="Overall changelog for the mod"
                      ></textarea>
                    {/if}
                  </div>
                </div>
              </Panel>

              <Panel>
                <div class="form-section">
                  <h3 class="section-title">Links & Source</h3>

                  <div class="form-group">
                    <label class="form-label">Source Platform</label>
                    <select bind:value={editSourceType} class="form-select">
                      <option value="">Not specified</option>
                      <option value="github">GitHub</option>
                      <option value="gitlab">GitLab</option>
                      <option value="bitbucket">Bitbucket</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Repository URL</label>
                    <input type="url" bind:value={editRepositoryUrl} class="form-input" placeholder="https://github.com/..." />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Discord URL</label>
                    <input type="url" bind:value={editDiscordUrl} class="form-input" placeholder="https://discord.gg/..." />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Website URL</label>
                    <input type="url" bind:value={editWebsiteUrl} class="form-input" placeholder="https://..." />
                  </div>

                  <div class="form-group">
                    <label class="form-label">License</label>
                    <input type="text" bind:value={editLicense} class="form-input" placeholder="MIT, GPL, All Rights Reserved, etc." />
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        {/if}

        <!-- Media Tab -->
        {#if activeTab === 'media'}
          <div class="tab-content">
            <div class="form-grid">
              <Panel>
                <div class="form-section">
                  <h3 class="section-title">Icon</h3>
                  <div class="icon-upload-area">
                    {#if mod.iconUrl}
                      <img src={mod.iconUrl} alt="Current icon" class="current-icon-large" />
                    {:else}
                      <div class="icon-placeholder-large">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    {/if}
                    <label class="upload-btn-large">
                      <input type="file" accept="image/*" onchange={uploadNewIcon} hidden />
                      {uploadingIcon ? 'Uploading...' : 'Upload New Icon'}
                    </label>
                  </div>
                  <p class="form-help">Recommended: 512x512 pixels, PNG or JPG</p>
                </div>
              </Panel>

              <Panel>
                <div class="form-section">
                  <h3 class="section-title">Gallery</h3>
                  <p class="form-help">Add screenshots and images to showcase your mod</p>

                  <label class="gallery-upload-btn">
                    <input type="file" accept="image/*" onchange={uploadGalleryImage} hidden />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {uploadingGallery ? 'Uploading...' : 'Add Image'}
                  </label>

                  {#if mod.gallery && mod.gallery.length > 0}
                    <div class="gallery-grid">
                      {#each mod.gallery as image}
                        <div class="gallery-item">
                          <img src={image.url} alt="Gallery" />
                          <button class="gallery-delete-btn" onclick={() => deleteGalleryImage(image)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="empty-text">No gallery images yet</p>
                  {/if}
                </div>
              </Panel>
            </div>
          </div>
        {/if}

        <!-- Versions Tab -->
        {#if activeTab === 'versions'}
          <div class="tab-content">
            <Panel>
              <div class="form-section">
                <div class="section-header">
                  <h3 class="section-title">Versions</h3>
                  {#if !showVersionForm}
                    <Button variant="primary" onclick={() => showVersionForm = true}>
                      Add New Version
                    </Button>
                  {/if}
                </div>

                {#if showVersionForm}
                  <div class="version-form">
                    <h4>New Version</h4>
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">Version Number *</label>
                        <input type="text" bind:value={newVersionNumber} class="form-input" placeholder="1.0.0" />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Game Versions</label>
                        <input type="text" bind:value={newVersionGameVersions} class="form-input" placeholder="1.0, 1.1 (comma separated)" />
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Changelog</label>
                      <textarea bind:value={newVersionChangelog} class="form-textarea" rows="4" placeholder="What's new in this version..."></textarea>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Mod File *</label>
                      <input type="file" accept=".zip,.jar,.rar" onchange={(e) => newVersionFile = e.target.files?.[0]} class="form-file" />
                      {#if newVersionFile}
                        <span class="file-name">{newVersionFile.name} ({formatFileSize(newVersionFile.size)})</span>
                      {/if}
                    </div>

                    {#if uploadingVersion}
                      <div class="upload-progress">
                        <div class="progress-bar" style="width: {versionUploadProgress}%"></div>
                      </div>
                    {/if}

                    <div class="form-actions">
                      <Button variant="primary" onclick={uploadNewVersion} disabled={uploadingVersion || !newVersionNumber || !newVersionFile}>
                        {uploadingVersion ? 'Uploading...' : 'Upload Version'}
                      </Button>
                      <Button onclick={() => showVersionForm = false}>Cancel</Button>
                    </div>
                  </div>
                {/if}

                {#if mod.versions && mod.versions.length > 0}
                  <div class="versions-list">
                    {#each mod.versions as version}
                      <div class="version-item">
                        <div class="version-main">
                          <span class="version-number">{version.versionNumber}</span>
                          <span class="version-date">{formatDate(version.createdAt)}</span>
                          <span class="version-size">{formatFileSize(version.fileSize)}</span>
                          {#if version.gameVersions && version.gameVersions.length > 0}
                            <span class="version-games">{version.gameVersions.join(', ')}</span>
                          {/if}
                        </div>
                        {#if version.changelog}
                          <div class="version-changelog">{version.changelog}</div>
                        {/if}
                        <div class="version-actions">
                          <a href={version.downloadUrl} class="version-download-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </a>
                          <button class="version-delete-btn" onclick={() => handleDeleteVersion(version)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="empty-text">No versions uploaded yet</p>
                {/if}
              </div>
            </Panel>
          </div>
        {/if}

        <!-- Dependencies Tab -->
        {#if activeTab === 'dependencies'}
          <div class="tab-content">
            <Panel>
              <div class="form-section">
                <div class="section-header">
                  <h3 class="section-title">Dependencies</h3>
                  {#if !showDependencyForm}
                    <Button variant="primary" onclick={() => showDependencyForm = true}>
                      Add Dependency
                    </Button>
                  {/if}
                </div>

                <p class="form-help">Specify other mods that are required, optional, or incompatible with your mod.</p>

                {#if showDependencyForm}
                  <div class="dependency-form">
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">Dependency Type</label>
                        <select bind:value={selectedDependencyType} class="form-select">
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="incompatible">Incompatible</option>
                        </select>
                      </div>
                      <div class="form-group" style="flex: 2">
                        <label class="form-label">Search Mods</label>
                        <input type="text" value={dependencySearch} oninput={handleDependencySearch} class="form-input" placeholder="Search for a mod..." />
                      </div>
                    </div>

                    {#if searchingDependencies}
                      <p class="searching-text">Searching...</p>
                    {:else if dependencySearchResults.length > 0}
                      <div class="dependency-results">
                        {#each dependencySearchResults as result}
                          <button class="dependency-result-item" onclick={() => handleAddDependency(result)} disabled={addingDependency}>
                            <div class="dep-result-icon">
                              {#if result.iconUrl}
                                <img src={result.iconUrl} alt={result.title} />
                              {:else}
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                              {/if}
                            </div>
                            <span class="dep-result-title">{result.title}</span>
                            <span class="dep-result-source">{result.isLocal ? 'Community' : 'Modtale'}</span>
                          </button>
                        {/each}
                      </div>
                    {:else if dependencySearch.length >= 2}
                      <p class="empty-text">No mods found</p>
                    {/if}

                    <div class="form-actions">
                      <Button onclick={() => { showDependencyForm = false; dependencySearch = ''; dependencySearchResults = []; }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                {/if}

                {#if mod.dependencies && mod.dependencies.length > 0}
                  <div class="dependencies-list">
                    {#each mod.dependencies as dep}
                      <div class="dependency-item">
                        <div class="dep-icon">
                          {#if dep.iconUrl}
                            <img src={dep.iconUrl} alt={dep.title} />
                          {:else}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                          {/if}
                        </div>
                        <div class="dep-info">
                          <span class="dep-title">{dep.title}</span>
                          <span class="dep-type dep-type-{dep.type}">{dep.type}</span>
                          <span class="dep-source">{dep.isLocal ? 'Community' : 'Modtale'}</span>
                        </div>
                        <button class="dep-remove-btn" onclick={() => handleRemoveDependency(dep)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    {/each}
                  </div>
                {:else if !showDependencyForm}
                  <p class="empty-text">No dependencies configured</p>
                {/if}
              </div>
            </Panel>
          </div>
        {/if}

        <!-- Danger Zone Tab -->
        {#if activeTab === 'danger'}
          <div class="tab-content">
            <Panel>
              <div class="form-section danger-section">
                <h3 class="section-title danger">Danger Zone</h3>
                <p class="danger-warning">These actions are irreversible. Please be certain.</p>

                <div class="danger-action">
                  <div class="danger-action-info">
                    <h4>Delete this mod</h4>
                    <p>Once you delete a mod, there is no going back. All versions, images, and data will be permanently removed.</p>
                  </div>
                  <button class="delete-btn" onclick={handleDelete}>
                    Delete Mod
                  </button>
                </div>
              </div>
            </Panel>
          </div>
        {/if}
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
    max-width: 1200px;
    margin: 0 auto;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    background: none;
    border: none;
    color: #8a7a6a;
    font-size: 0.9rem;
    cursor: pointer;
    margin-bottom: 1.5rem;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: #c4b8a4;
  }

  .back-link svg {
    width: 18px;
    height: 18px;
  }

  /* Header */
  .edit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .edit-header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .edit-icon {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    object-fit: cover;
    border: 1px solid #4a3f32;
  }

  .edit-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 0.25rem 0;
  }

  .status-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 3px;
  }

  .status-draft {
    background: rgba(138, 122, 106, 0.2);
    border: 1px solid rgba(138, 122, 106, 0.4);
    color: #8a7a6a;
  }

  .status-published {
    background: rgba(126, 196, 123, 0.15);
    border: 1px solid rgba(126, 196, 123, 0.4);
    color: #7ec47b;
  }

  .status-archived {
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.4);
    color: #c46b6b;
  }

  /* Markdown Editor */
  .markdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .markdown-header .form-label {
    margin-bottom: 0;
  }

  .preview-toggle {
    padding: 0.35rem 0.75rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    color: #8a7a6a;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preview-toggle:hover {
    border-color: #6b5a48;
    color: #c4b8a4;
  }

  .preview-toggle.active {
    background: linear-gradient(180deg, #4a3f32 0%, #3a3127 100%);
    border-color: #6bb8cc;
    color: #6bb8cc;
  }

  .markdown-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.5rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
  }

  .markdown-toolbar + .form-textarea {
    border-radius: 0 0 6px 6px;
  }

  .markdown-toolbar button {
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #8a7a6a;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .markdown-toolbar button:hover {
    background: rgba(107, 184, 204, 0.1);
    border-color: rgba(107, 184, 204, 0.3);
    color: #6bb8cc;
  }

  .markdown-toolbar button svg {
    width: 16px;
    height: 16px;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background: #3d3428;
    margin: 4px 0.25rem;
  }

  .markdown-preview {
    padding: 1rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
    min-height: 120px;
    color: #c4b8a4;
    font-size: 0.9rem;
    line-height: 1.6;
    overflow-y: auto;
  }

  .markdown-preview.tall {
    min-height: 240px;
  }

  .markdown-preview :global(h1),
  .markdown-preview :global(h2),
  .markdown-preview :global(h3) {
    color: #f5d898;
    margin: 0.75rem 0 0.5rem;
  }

  .markdown-preview :global(h1) { font-size: 1.5rem; }
  .markdown-preview :global(h2) { font-size: 1.25rem; }
  .markdown-preview :global(h3) { font-size: 1.1rem; }

  .markdown-preview :global(p) {
    margin: 0.5rem 0;
  }

  .markdown-preview :global(ul),
  .markdown-preview :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .markdown-preview :global(li) {
    margin: 0.25rem 0;
  }

  .markdown-preview :global(a) {
    color: #6bb8cc;
    text-decoration: none;
  }

  .markdown-preview :global(a:hover) {
    text-decoration: underline;
  }

  .markdown-preview :global(code) {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.15rem 0.35rem;
    border-radius: 3px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    color: #e0d8c0;
  }

  .markdown-preview :global(pre) {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.75rem 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0.5rem 0;
  }

  .markdown-preview :global(pre code) {
    padding: 0;
    background: none;
  }

  .markdown-preview :global(blockquote) {
    border-left: 3px solid #4a3f32;
    padding-left: 1rem;
    margin: 0.5rem 0;
    color: #8a7a6a;
  }

  .markdown-preview :global(img) {
    max-width: 100%;
    border-radius: 6px;
  }

  .preview-placeholder {
    color: #6a5a4a;
    font-style: italic;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid #3d3428;
    margin-bottom: 1.5rem;
    overflow-x: auto;
  }

  .tab {
    padding: 0.75rem 1.25rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #8a7a6a;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .tab:hover {
    color: #c4b8a4;
  }

  .tab.active {
    color: #f5d898;
    border-bottom-color: #f5d898;
  }

  .tab-danger {
    color: #c46b6b;
  }

  .tab-danger.active {
    color: #c46b6b;
    border-bottom-color: #c46b6b;
  }

  .tab-content {
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Form Grid */
  .form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 1024px) {
    .form-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .form-section {
    padding: 0.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0 0 1rem 0;
  }

  .section-header .section-title {
    margin: 0;
  }

  .section-title.danger {
    color: #c46b6b;
  }

  /* Form Elements */
  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .form-row .form-group {
    flex: 1;
    min-width: 200px;
  }

  .form-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    color: #c4b8a4;
    margin-bottom: 0.5rem;
  }

  .form-input,
  .form-textarea,
  .form-select {
    width: 100%;
    padding: 0.65rem 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
    color: #f0e6d8;
    font-size: 0.9rem;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  .form-input:focus,
  .form-textarea:focus,
  .form-select:focus {
    outline: none;
    border-color: #6bb8cc;
  }

  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-textarea.tall {
    min-height: 200px;
  }

  .form-select {
    cursor: pointer;
  }

  .form-file {
    width: 100%;
    padding: 0.5rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
    color: #c4b8a4;
    font-size: 0.85rem;
  }

  .form-help {
    font-size: 0.8rem;
    color: #6a5a4a;
    margin-top: 0.35rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .file-name {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.8rem;
    color: #8a7a6a;
  }

  /* Icon Upload */
  .icon-upload-area {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .current-icon-large {
    width: 128px;
    height: 128px;
    border-radius: 12px;
    object-fit: cover;
    border: 1px solid #4a3f32;
  }

  .icon-placeholder-large {
    width: 128px;
    height: 128px;
    border-radius: 12px;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6a5a4a;
  }

  .icon-placeholder-large svg {
    width: 48px;
    height: 48px;
  }

  .upload-btn-large {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    color: #c4b8a4;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .upload-btn-large:hover {
    border-color: #6b5a48;
    color: #f0e6d8;
  }

  /* Gallery */
  .gallery-upload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 1rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px dashed #4a3f32;
    border-radius: 6px;
    color: #8a7a6a;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 1rem;
  }

  .gallery-upload-btn:hover {
    border-color: #6bb8cc;
    color: #6bb8cc;
  }

  .gallery-upload-btn svg {
    width: 20px;
    height: 20px;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .gallery-item {
    position: relative;
    aspect-ratio: 16/9;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #3d3428;
  }

  .gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gallery-delete-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 28px;
    height: 28px;
    padding: 0;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(196, 107, 107, 0.4);
    border-radius: 50%;
    color: #c46b6b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .gallery-item:hover .gallery-delete-btn {
    opacity: 1;
  }

  .gallery-delete-btn svg {
    width: 14px;
    height: 14px;
  }

  /* Versions */
  .version-form,
  .dependency-form {
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .version-form h4 {
    margin: 0 0 1rem 0;
    color: #f5d898;
    font-size: 1rem;
  }

  .upload-progress {
    height: 6px;
    background: #3d3428;
    border-radius: 3px;
    overflow: hidden;
    margin-top: 0.75rem;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #6bb8cc, #7ec47b);
    transition: width 0.3s ease;
  }

  .versions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .version-item {
    padding: 1rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 8px;
  }

  .version-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .version-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    color: #6bb8cc;
    font-weight: 600;
  }

  .version-date,
  .version-size,
  .version-games {
    font-size: 0.8rem;
    color: #6a5a4a;
  }

  .version-changelog {
    font-size: 0.85rem;
    color: #a89880;
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .version-actions {
    display: flex;
    gap: 0.75rem;
  }

  .version-download-btn,
  .version-delete-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .version-download-btn {
    background: linear-gradient(180deg, #3a5a3a 0%, #2d4a2d 100%);
    border: 1px solid #4a6a4a;
    color: #b8e0b8;
    text-decoration: none;
  }

  .version-download-btn:hover {
    background: linear-gradient(180deg, #4a6a4a 0%, #3a5a3a 100%);
  }

  .version-delete-btn {
    background: transparent;
    border: 1px solid rgba(196, 107, 107, 0.4);
    color: #c46b6b;
  }

  .version-delete-btn:hover {
    background: rgba(196, 107, 107, 0.15);
  }

  .version-download-btn svg,
  .version-delete-btn svg {
    width: 14px;
    height: 14px;
  }

  /* Dependencies */
  .dependency-results {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 250px;
    overflow-y: auto;
    margin-bottom: 1rem;
  }

  .dependency-result-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
    cursor: pointer;
    width: 100%;
    text-align: left;
    font-family: inherit;
    transition: all 0.15s;
  }

  .dependency-result-item:hover:not(:disabled) {
    border-color: #6bb8cc;
  }

  .dep-result-icon {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .dep-result-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .dep-result-icon svg {
    width: 18px;
    height: 18px;
    color: #6a5a4a;
  }

  .dep-result-title {
    flex: 1;
    font-size: 0.9rem;
    color: #f0e6d8;
  }

  .dep-result-source {
    font-size: 0.75rem;
    color: #6a5a4a;
  }

  .dependencies-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .dependency-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: linear-gradient(180deg, #2a241c 0%, #242018 100%);
    border: 1px solid #3d3428;
    border-radius: 6px;
  }

  .dep-icon {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .dep-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .dep-icon svg {
    width: 20px;
    height: 20px;
    color: #6a5a4a;
  }

  .dep-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .dep-title {
    font-size: 0.95rem;
    color: #f0e6d8;
    font-weight: 500;
  }

  .dep-type {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .dep-type-required {
    background: rgba(107, 184, 204, 0.15);
    border: 1px solid rgba(107, 184, 204, 0.4);
    color: #6bb8cc;
  }

  .dep-type-optional {
    background: rgba(212, 164, 76, 0.15);
    border: 1px solid rgba(212, 164, 76, 0.4);
    color: #d4a44c;
  }

  .dep-type-incompatible {
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.4);
    color: #c46b6b;
  }

  .dep-source {
    font-size: 0.75rem;
    color: #6a5a4a;
  }

  .dep-remove-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #6a5a4a;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .dep-remove-btn:hover {
    border-color: rgba(196, 107, 107, 0.4);
    color: #c46b6b;
  }

  .dep-remove-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Danger Zone */
  .danger-section {
    border: 1px solid rgba(196, 107, 107, 0.3);
    border-radius: 8px;
    padding: 1rem;
  }

  .danger-warning {
    font-size: 0.9rem;
    color: #8a7a6a;
    margin: 0 0 1.5rem 0;
  }

  .danger-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(196, 107, 107, 0.1);
    border: 1px solid rgba(196, 107, 107, 0.2);
    border-radius: 6px;
    gap: 1rem;
  }

  .danger-action-info h4 {
    margin: 0 0 0.35rem 0;
    color: #c4b8a4;
    font-size: 0.95rem;
  }

  .danger-action-info p {
    margin: 0;
    font-size: 0.85rem;
    color: #8a7a6a;
  }

  .delete-btn {
    padding: 0.65rem 1.25rem;
    background: rgba(196, 107, 107, 0.15);
    border: 1px solid rgba(196, 107, 107, 0.4);
    border-radius: 6px;
    color: #c46b6b;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .delete-btn:hover {
    background: rgba(196, 107, 107, 0.25);
    border-color: #c46b6b;
  }

  /* States */
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #3d3428;
    border-top-color: #6bb8cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state h3 {
    color: #c46b6b;
    margin: 0 0 0.5rem 0;
  }

  .error-state p {
    color: #8a7a6a;
    margin: 0 0 1.5rem 0;
  }

  .empty-text,
  .searching-text {
    font-size: 0.9rem;
    color: #6a5a4a;
    font-style: italic;
    margin: 1rem 0;
  }
</style>
