<script>
  import { auth } from './stores/auth.svelte.js'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Panel from './Panel.svelte'
  import UploadForm from './UploadForm.svelte'
  import AuthModal from './AuthModal.svelte'

  let { onnavigate = () => {} } = $props()

  let showAuthModal = $state(false)
  let uploadSuccess = $state(false)
  let uploadedItem = $state(null)

  function handleUploadSuccess(item) {
    uploadedItem = item
    uploadSuccess = true
  }

  function handleUploadAnother() {
    uploadSuccess = false
    uploadedItem = null
  }
</script>

<div class="page">
  <Navbar currentPage="upload" onnavigate={onnavigate} />

  <main class="main">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">Upload Content</h1>
        <p class="page-subtitle">Share your creations with the Hytale community</p>
      </div>

      {#if !auth.isAuthenticated}
        <Panel>
          <div class="auth-prompt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2>Sign in to Upload</h2>
            <p>You need to be logged in to upload builds and worlds.</p>
            <button class="auth-btn" onclick={() => showAuthModal = true}>
              Sign In / Create Account
            </button>
          </div>
        </Panel>
      {:else if uploadSuccess}
        <Panel>
          <div class="success-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <h2>Upload Successful!</h2>
            <p>Your {uploadedItem?.content_type || 'content'} "{uploadedItem?.title}" has been uploaded.</p>
            <div class="success-actions">
              <button class="view-btn" onclick={() => onnavigate(`${uploadedItem?.content_type || 'build'}-${uploadedItem?.slug}`)}>
                View Upload
              </button>
              <button class="another-btn" onclick={handleUploadAnother}>
                Upload Another
              </button>
            </div>
          </div>
        </Panel>
      {:else}
        <Panel>
          <UploadForm onsuccess={handleUploadSuccess} />
        </Panel>
      {/if}
    </div>
  </main>

  <Footer />
</div>

<AuthModal bind:open={showAuthModal} onclose={() => showAuthModal = false} />

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main {
    flex: 1;
    padding: 3rem 1.5rem;
  }

  .container {
    max-width: 48rem;
    margin: 0 auto;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 0.5rem 0;
  }

  .page-subtitle {
    font-size: 1rem;
    color: #a89880;
    margin: 0;
  }

  /* Auth Prompt */
  .auth-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 3rem 2rem;
  }

  .auth-prompt svg {
    width: 48px;
    height: 48px;
    color: #d4a44c;
    margin-bottom: 1.5rem;
  }

  .auth-prompt h2 {
    font-size: 1.5rem;
    color: #f5d898;
    margin: 0 0 0.75rem 0;
  }

  .auth-prompt p {
    font-size: 0.95rem;
    color: #a89880;
    margin: 0 0 1.5rem 0;
  }

  .auth-btn {
    padding: 0.75rem 1.5rem;
    font-family: 'Cinzel', serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #1a1208;
    background: linear-gradient(180deg, #e8c36b 0%, #c49a3a 50%, #a67c28 100%);
    border: 2px solid #8b6914;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .auth-btn:hover {
    background: linear-gradient(180deg, #f0d080 0%, #d4a844 50%, #b88830 100%);
  }

  /* Success Content */
  .success-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 3rem 2rem;
  }

  .success-content svg {
    width: 64px;
    height: 64px;
    color: #7ec47b;
    margin-bottom: 1.5rem;
  }

  .success-content h2 {
    font-size: 1.5rem;
    color: #7ec47b;
    margin: 0 0 0.75rem 0;
  }

  .success-content p {
    font-size: 0.95rem;
    color: #c4b8a4;
    margin: 0 0 2rem 0;
  }

  .success-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .view-btn {
    padding: 0.75rem 1.5rem;
    font-family: 'Cinzel', serif;
    font-size: 0.9rem;
    font-weight: 600;
    color: #1a1208;
    background: linear-gradient(180deg, #e8c36b 0%, #c49a3a 50%, #a67c28 100%);
    border: 2px solid #8b6914;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .view-btn:hover {
    background: linear-gradient(180deg, #f0d080 0%, #d4a844 50%, #b88830 100%);
  }

  .another-btn {
    padding: 0.75rem 1.5rem;
    font-family: 'Cinzel', serif;
    font-size: 0.9rem;
    font-weight: 600;
    color: #f0e6d8;
    background: linear-gradient(180deg, #4d4235 0%, #3a3127 100%);
    border: 2px solid #6b5a48;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .another-btn:hover {
    background: linear-gradient(180deg, #5a4d3e 0%, #453a2e 100%);
    border-color: #9c8465;
    color: #f5d898;
  }
</style>
