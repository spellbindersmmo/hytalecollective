<script>
  import { onMount } from 'svelte'
  import Navbar from './Navbar.svelte'
  import Footer from './Footer.svelte'
  import Button from './Button.svelte'
  import { auth } from './stores/auth.svelte.js'

  let { onnavigate = () => {} } = $props()

  // EmailJS configuration - replace these with your actual values
  const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID'
  const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'
  const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'

  let formData = $state({
    name: '',
    email: '',
    category: 'bug',
    subject: '',
    description: ''
  })

  let submitting = $state(false)
  let submitted = $state(false)
  let error = $state(null)

  // Pre-fill email if user is logged in
  onMount(() => {
    if (auth.user?.email) {
      formData.email = auth.user.email
    }
    if (auth.profile?.username) {
      formData.name = auth.profile.username
    }
  })

  const categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'content', label: 'Content Issue' },
    { value: 'account', label: 'Account Problem' },
    { value: 'other', label: 'Other' }
  ]

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.subject || !formData.description) {
      error = 'Please fill in all required fields.'
      return
    }

    submitting = true
    error = null

    try {
      // Load EmailJS SDK dynamically
      if (!window.emailjs) {
        await loadEmailJS()
      }

      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        category: categories.find(c => c.value === formData.category)?.label || formData.category,
        subject: formData.subject,
        message: formData.description,
        to_email: 'hytalecollective@gmail.com'
      }

      await window.emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      )

      submitted = true
    } catch (err) {
      console.error('Failed to send report:', err)
      error = 'Failed to send report. Please try again or contact us directly at hytalecollective@gmail.com'
    } finally {
      submitting = false
    }
  }

  function loadEmailJS() {
    return new Promise((resolve, reject) => {
      if (window.emailjs) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
      script.onload = () => {
        window.emailjs.init(EMAILJS_PUBLIC_KEY)
        resolve()
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  function resetForm() {
    formData = {
      name: auth.profile?.username || '',
      email: auth.user?.email || '',
      category: 'bug',
      subject: '',
      description: ''
    }
    submitted = false
    error = null
  }
</script>

<div class="page">
  <Navbar currentPage="report" {onnavigate} />

  <main class="main">
    <div class="container">
      <div class="header">
        <button class="back-button" onclick={() => onnavigate('home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 class="title">Report an Issue</h1>
        <p class="subtitle">Help us improve Hytale Collective by reporting bugs, suggesting features, or letting us know about any problems.</p>
      </div>

      <div class="content-panel">
        {#if submitted}
          <div class="success-message">
            <svg class="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <h2>Report Submitted</h2>
            <p>Thank you for your feedback! We'll review your report and get back to you if needed.</p>
            <div class="success-actions">
              <Button variant="secondary" onclick={resetForm}>Submit Another Report</Button>
              <Button variant="primary" onclick={() => onnavigate('home')}>Return Home</Button>
            </div>
          </div>
        {:else}
          <form class="report-form" onsubmit={handleSubmit}>
            {#if error}
              <div class="error-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            {/if}

            <div class="form-row">
              <div class="form-group">
                <label for="name">Your Name <span class="required">*</span></label>
                <input
                  type="text"
                  id="name"
                  bind:value={formData.name}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div class="form-group">
                <label for="email">Email Address <span class="required">*</span></label>
                <input
                  type="email"
                  id="email"
                  bind:value={formData.email}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="category">Category</label>
                <select id="category" bind:value={formData.category}>
                  {#each categories as cat}
                    <option value={cat.value}>{cat.label}</option>
                  {/each}
                </select>
              </div>

              <div class="form-group">
                <label for="subject">Subject <span class="required">*</span></label>
                <input
                  type="text"
                  id="subject"
                  bind:value={formData.subject}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="description">Description <span class="required">*</span></label>
              <textarea
                id="description"
                bind:value={formData.description}
                placeholder="Please provide as much detail as possible. Include steps to reproduce if reporting a bug."
                rows="6"
                required
              ></textarea>
            </div>

            <div class="form-actions">
              <Button variant="secondary" onclick={() => onnavigate('home')}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {#if submitting}
                  <span class="spinner"></span>
                  Sending...
                {:else}
                  Submit Report
                {/if}
              </Button>
            </div>
          </form>
        {/if}
      </div>

      <div class="contact-info">
        <p>You can also reach us directly at <a href="mailto:hytalecollective@gmail.com">hytalecollective@gmail.com</a></p>
      </div>
    </div>
  </main>

  <Footer {onnavigate} />
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #0d0b09;
  }

  .main {
    flex: 1;
    padding: 2rem 1.5rem;
  }

  .container {
    max-width: 48rem;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 2rem;
  }

  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: #a89880;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0;
    margin-bottom: 1rem;
    transition: color 0.15s ease;
  }

  .back-button:hover {
    color: #f0d090;
  }

  .back-button svg {
    width: 18px;
    height: 18px;
  }

  .title {
    font-family: 'Cinzel', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: #a89880;
    font-size: 1rem;
    margin: 0;
    line-height: 1.6;
  }

  .content-panel {
    background: linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #3d3428;
    border-radius: 8px;
    padding: 2rem;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .report-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .form-row {
      grid-template-columns: 1fr 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #c4b8a4;
  }

  .required {
    color: #c9973b;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    background: #1a1512;
    border: 1px solid #3d3428;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
    color: #e8dcc8;
    font-family: inherit;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #c9973b;
    box-shadow: 0 0 0 3px rgba(201, 151, 59, 0.15);
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #6b5d4d;
  }

  .form-group select {
    cursor: pointer;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 120px;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 0.5rem;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(180, 83, 83, 0.15);
    border: 1px solid rgba(180, 83, 83, 0.3);
    border-radius: 6px;
    padding: 1rem;
    color: #e8a8a8;
    font-size: 0.9rem;
  }

  .error-banner svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .success-message {
    text-align: center;
    padding: 2rem 1rem;
  }

  .success-icon {
    width: 64px;
    height: 64px;
    color: #7cb97c;
    margin-bottom: 1.5rem;
  }

  .success-message h2 {
    font-family: 'Cinzel', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 0.75rem 0;
  }

  .success-message p {
    color: #a89880;
    font-size: 1rem;
    margin: 0 0 2rem 0;
  }

  .success-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .contact-info {
    text-align: center;
    margin-top: 1.5rem;
  }

  .contact-info p {
    color: #6b5d4d;
    font-size: 0.9rem;
    margin: 0;
  }

  .contact-info a {
    color: #c9973b;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .contact-info a:hover {
    color: #f0d090;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
