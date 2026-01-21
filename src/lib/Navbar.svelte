<script>
  import Button from './Button.svelte'

  let { currentPage = 'home' } = $props()

  const navItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'builds', label: 'Builds', href: '/builds' },
    { id: 'worlds', label: 'Worlds', href: '/worlds' },
    { id: 'servers', label: 'Servers', href: '/servers' },
    { id: 'forum', label: 'Forum', href: '/forum' }
  ]

  let mobileMenuOpen = $state(false)
</script>

<nav class="navbar">
  <div class="navbar-bg"></div>
  <div class="navbar-inner">
    <!-- Logo with crest design -->
    <a href="/" class="logo">
      <div class="logo-crest">
        <svg viewBox="0 0 40 44" class="crest-svg">
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#5c4d3d"/>
              <stop offset="50%" stop-color="#4a3d30"/>
              <stop offset="100%" stop-color="#3d3428"/>
            </linearGradient>
            <linearGradient id="innerShieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#2a2318"/>
              <stop offset="100%" stop-color="#1a1512"/>
            </linearGradient>
            <filter id="shieldShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.5"/>
            </filter>
          </defs>
          <path d="M20 2 L38 8 L38 20 C38 32 20 42 20 42 C20 42 2 32 2 20 L2 8 Z"
                fill="url(#shieldGradient)" stroke="#8b7355" stroke-width="1.5" filter="url(#shieldShadow)"/>
          <path d="M20 6 L34 11 L34 19 C34 28 20 36 20 36 C20 36 6 28 6 19 L6 11 Z"
                fill="url(#innerShieldGradient)" stroke="#5c4d3d" stroke-width="1"/>
          <text x="20" y="26" text-anchor="middle" class="crest-letter">H</text>
        </svg>
      </div>
      <div class="logo-text">
        <span class="logo-title">Hytale</span>
        <span class="logo-subtitle">Collective</span>
      </div>
    </a>

    <!-- Desktop Navigation -->
    <div class="nav-links">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link"
          class:active={currentPage === item.id}
        >
          {item.label}
        </a>
      {/each}
    </div>

    <!-- Auth Buttons -->
    <div class="nav-auth">
      <Button variant="ghost">Log In</Button>
      <Button variant="primary">Sign Up</Button>
    </div>

    <!-- Mobile Menu Button -->
    <button
      class="mobile-menu-btn"
      onclick={() => mobileMenuOpen = !mobileMenuOpen}
    >
      <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {#if mobileMenuOpen}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        {:else}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        {/if}
      </svg>
    </button>
  </div>

  <!-- Mobile Menu -->
  {#if mobileMenuOpen}
    <div class="mobile-menu">
      {#each navItems as item}
        <a
          href={item.href}
          class="mobile-link"
          class:active={currentPage === item.id}
        >
          {item.label}
        </a>
      {/each}
      <div class="mobile-auth">
        <Button variant="ghost">Log In</Button>
        <Button variant="primary">Sign Up</Button>
      </div>
    </div>
  {/if}

  <div class="navbar-border"></div>
</nav>

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .navbar-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 30% 50%, rgba(65, 55, 42, 0.4) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 50%, rgba(58, 48, 38, 0.35) 0%, transparent 40%),
      linear-gradient(180deg, #252019 0%, #1a1714 100%);
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.5),
      inset 0 -1px 0 rgba(80, 68, 52, 0.3);
  }


  .navbar-border {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background:
      linear-gradient(90deg,
        transparent 0%,
        #4a3f32 15%,
        #6b5a48 30%,
        #7c6a56 50%,
        #6b5a48 70%,
        #4a3f32 85%,
        transparent 100%
      );
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .navbar-inner {
    position: relative;
    max-width: 80rem;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 4.5rem;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
  }

  .logo-crest {
    width: 40px;
    height: 44px;
  }

  .crest-svg {
    width: 100%;
    height: 100%;
  }

  .crest-letter {
    font-family: 'Cinzel', serif;
    font-size: 16px;
    font-weight: 700;
    fill: #d4a44c;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
  }

  .logo-text {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .logo-title {
    font-family: 'Cinzel', serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f0d090;
    letter-spacing: 0.1em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .logo-subtitle {
    font-family: 'Cinzel', serif;
    font-size: 0.7rem;
    font-weight: 600;
    color: #a89880;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .nav-links {
    display: none;
    align-items: center;
    gap: 0.25rem;
  }

  @media (min-width: 768px) {
    .nav-links {
      display: flex;
    }
  }

  .nav-link {
    position: relative;
    padding: 0.5rem 1rem;
    font-family: 'Cinzel', serif;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: #c4b8a4;
    text-decoration: none;
    transition: color 0.2s;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .nav-link:hover {
    color: #f0e6d8;
  }

  .nav-link.active {
    color: #d4a44c;
  }

  .nav-link.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 1rem;
    right: 1rem;
    height: 2px;
    background: linear-gradient(90deg, transparent, #d4a44c, transparent);
    box-shadow: 0 0 8px rgba(212, 164, 76, 0.5);
  }

  .nav-auth {
    display: none;
    align-items: center;
    gap: 0.75rem;
  }

  @media (min-width: 768px) {
    .nav-auth {
      display: flex;
    }
  }

  .mobile-menu-btn {
    display: flex;
    padding: 0.5rem;
    color: #a89880;
    background: none;
    border: none;
    cursor: pointer;
  }

  .mobile-menu-btn:hover {
    color: #e8dcc8;
  }

  .menu-icon {
    width: 24px;
    height: 24px;
  }

  @media (min-width: 768px) {
    .mobile-menu-btn {
      display: none;
    }
  }

  .mobile-menu {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(45, 38, 28, 0.4) 0%, transparent 70%),
      linear-gradient(180deg, #16130f 0%, #12100c 100%);
    border-top: 1px solid #3d3428;
  }


  @media (min-width: 768px) {
    .mobile-menu {
      display: none;
    }
  }

  .mobile-link {
    position: relative;
    padding: 0.75rem 1rem;
    font-family: 'Cinzel', serif;
    font-weight: 600;
    color: #a89880;
    text-decoration: none;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .mobile-link:hover {
    color: #e8dcc8;
    background: rgba(60, 50, 40, 0.3);
  }

  .mobile-link.active {
    color: #d4a44c;
    background: rgba(60, 50, 40, 0.3);
  }

  .mobile-auth {
    position: relative;
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #3d3428;
  }

  @media (max-width: 640px) {
    .logo-text {
      display: none;
    }
  }
</style>
