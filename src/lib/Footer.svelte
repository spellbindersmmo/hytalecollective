<script>
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    explore: [
      { label: 'Builds', href: '/builds' },
      { label: 'Worlds', href: '/worlds' },
      { label: 'Servers', href: '/servers' },
      { label: 'Collections', href: '/collections' }
    ],
    community: [
      { label: 'Forum', href: '/forum' },
      { label: 'Discord', href: '#' },
      { label: 'Events', href: '/events' },
      { label: 'Creators', href: '/creators' }
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Guidelines', href: '/guidelines' },
      { label: 'Contact', href: '/contact' },
      { label: 'Report Issue', href: '/report' }
    ]
  }
</script>

<footer class="footer">
  <div class="footer-border"></div>

  <div class="footer-content">
    <div class="footer-grid">
      <!-- Brand -->
      <div class="footer-brand">
        <div class="brand-logo">
          <svg viewBox="0 0 40 44" class="logo-svg">
            <path d="M20 2 L38 8 L38 20 C38 32 20 42 20 42 C20 42 2 32 2 20 L2 8 Z"
                  fill="url(#footerShieldGradient)" stroke="#8b7355" stroke-width="2"/>
            <path d="M20 6 L34 11 L34 19 C34 28 20 36 20 36 C20 36 6 28 6 19 L6 11 Z"
                  fill="url(#footerInnerShieldGradient)" stroke="#5c4d3d" stroke-width="1"/>
            <text x="20" y="26" text-anchor="middle" class="logo-letter">H</text>
            <defs>
              <linearGradient id="footerShieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#5c4d3d"/>
                <stop offset="100%" stop-color="#3d3428"/>
              </linearGradient>
              <linearGradient id="footerInnerShieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#2a2318"/>
                <stop offset="100%" stop-color="#1a1512"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="brand-text">
            <span class="brand-title">Hytale Collective</span>
          </div>
        </div>
        <p class="brand-desc">
          A community-driven platform for Hytale enthusiasts to share, discover, and connect.
        </p>
      </div>

      <!-- Links -->
      <div class="footer-links">
        <div class="link-group">
          <h4 class="link-title">Explore</h4>
          <ul class="link-list">
            {#each footerLinks.explore as link}
              <li><a href={link.href}>{link.label}</a></li>
            {/each}
          </ul>
        </div>

        <div class="link-group">
          <h4 class="link-title">Community</h4>
          <ul class="link-list">
            {#each footerLinks.community as link}
              <li><a href={link.href}>{link.label}</a></li>
            {/each}
          </ul>
        </div>

        <div class="link-group">
          <h4 class="link-title">Support</h4>
          <ul class="link-list">
            {#each footerLinks.support as link}
              <li><a href={link.href}>{link.label}</a></li>
            {/each}
          </ul>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="footer-bottom">
      <p class="copyright">
        © {currentYear} Hytale Collective. Not affiliated with Hypixel Studios.
      </p>
      <div class="legal-links">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </div>
    </div>
  </div>
</footer>

<style>
  .footer {
    position: relative;
    background: linear-gradient(180deg, #0d0b09 0%, #0a0908 100%);
  }

  .footer-border {
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, #3d3428 20%, #5c4d3d 50%, #3d3428 80%, transparent 100%);
  }

  .footer-content {
    max-width: 80rem;
    margin: 0 auto;
    padding: 3rem 1.5rem 2rem;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  @media (min-width: 768px) {
    .footer-grid {
      grid-template-columns: 1.5fr 2fr;
    }
  }

  .footer-brand {
    max-width: 280px;
  }

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .logo-svg {
    width: 36px;
    height: 40px;
  }

  .logo-letter {
    font-family: 'Cinzel', serif;
    font-size: 14px;
    font-weight: 700;
    fill: #d4a44c;
  }

  .brand-title {
    font-family: 'Cinzel', serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #f0d090;
    letter-spacing: 0.05em;
  }

  .brand-desc {
    font-size: 0.85rem;
    color: #a89880;
    margin: 0;
    line-height: 1.6;
  }

  .footer-links {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .link-title {
    font-family: 'Cinzel', serif;
    font-size: 0.75rem;
    font-weight: 700;
    color: #d4a44c;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 1rem 0;
  }

  .link-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .link-list li {
    margin-bottom: 0.5rem;
  }

  .link-list a {
    font-size: 0.85rem;
    color: #a89880;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .link-list a:hover {
    color: #f0d090;
  }

  .footer-bottom {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #3d3428;
  }

  @media (min-width: 640px) {
    .footer-bottom {
      flex-direction: row;
      justify-content: space-between;
    }
  }

  .copyright {
    font-size: 0.8rem;
    color: #6b5d4d;
    margin: 0;
  }

  .legal-links {
    display: flex;
    gap: 1.5rem;
  }

  .legal-links a {
    font-size: 0.8rem;
    color: #6b5d4d;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .legal-links a:hover {
    color: #a89880;
  }
</style>
