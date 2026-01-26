<script>
  import Button from './Button.svelte'
  import AuthModal from './AuthModal.svelte'
  import UsernameSetupModal from './UsernameSetupModal.svelte'
  import { auth } from './stores/auth.svelte.js'

  let { currentPage = 'home', onnavigate = () => {} } = $props()

  const navItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'mods', label: 'Mods', href: '/mods' },
    { id: 'builds', label: 'Builds', href: '/builds' },
    { id: 'servers', label: 'Servers', href: '/servers' },
    { id: 'forum', label: 'Forum', href: '/forum' }
  ]

  let mobileMenuOpen = $state(false)
  let userMenuOpen = $state(false)

  function openAuthModal(mode = 'login') {
    auth.openModal(mode)
    mobileMenuOpen = false
  }

  function toggleUserMenu() {
    userMenuOpen = !userMenuOpen
  }

  function closeUserMenu() {
    userMenuOpen = false
  }

  async function handleSignOut() {
    try {
      await auth.signOut()
    } catch (e) {
      console.error('Sign out error:', e)
    }
    userMenuOpen = false
    mobileMenuOpen = false
    onnavigate('home')
  }
</script>

<nav class="navbar">
  <div class="navbar-bg"></div>
  <div class="navbar-inner">
    <!-- Logo with crest design -->
    <a href="/" class="logo" onclick={(e) => { e.preventDefault(); onnavigate('home'); }}>
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
          onclick={(e) => { e.preventDefault(); onnavigate(item.id); }}
        >
          {item.label}
        </a>
      {/each}
    </div>

    <!-- Auth Buttons -->
    <div class="nav-auth">
      {#if auth.isAuthenticated}
        <div class="user-menu-container">
          <button class="user-menu-btn" onclick={toggleUserMenu}>
            <div class="user-avatar-wrapper">
              <div class="user-avatar-placeholder">
                {auth.profile?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              {#if auth.profile?.avatar_url && auth.profile.avatar_url.startsWith('http')}
                <img
                  src={auth.profile.avatar_url}
                  alt=""
                  class="user-avatar"
                  onerror={(e) => e.target.style.display = 'none'}
                />
              {/if}
            </div>
            <span class="user-name">{auth.profile?.username || 'User'}</span>
            <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {#if userMenuOpen}
            <div class="user-dropdown">
              <a href="/profile" class="dropdown-item" onclick={(e) => { e.preventDefault(); closeUserMenu(); onnavigate(`profile-${auth.profile?.username}`); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </a>
              <a href="/settings" class="dropdown-item" onclick={(e) => { e.preventDefault(); closeUserMenu(); onnavigate('settings'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
              </a>
              {#if auth.isAdmin}
                <a href="/admin" class="dropdown-item admin" onclick={(e) => { e.preventDefault(); closeUserMenu(); onnavigate('admin'); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Admin Panel
                </a>
              {/if}
              <div class="dropdown-divider"></div>
              <button class="dropdown-item logout" onclick={handleSignOut}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <Button variant="ghost" onclick={() => openAuthModal('login')}>Log In</Button>
        <Button variant="primary" onclick={() => openAuthModal('signup')}>Sign Up</Button>
      {/if}
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
          onclick={(e) => { e.preventDefault(); mobileMenuOpen = false; onnavigate(item.id); }}
        >
          {item.label}
        </a>
      {/each}
      <div class="mobile-auth">
        {#if auth.isAuthenticated}
          <a href="/profile" class="mobile-link" onclick={(e) => { e.preventDefault(); mobileMenuOpen = false; onnavigate(`profile-${auth.profile?.username}`); }}>Profile</a>
          <a href="/settings" class="mobile-link" onclick={(e) => { e.preventDefault(); mobileMenuOpen = false; onnavigate('settings'); }}>Settings</a>
          {#if auth.isAdmin}
            <a href="/admin" class="mobile-link admin" onclick={(e) => { e.preventDefault(); mobileMenuOpen = false; onnavigate('admin'); }}>Admin Panel</a>
          {/if}
          <button class="mobile-link logout" onclick={handleSignOut}>Sign Out</button>
        {:else}
          <Button variant="ghost" onclick={() => openAuthModal('login')}>Log In</Button>
          <Button variant="primary" onclick={() => openAuthModal('signup')}>Sign Up</Button>
        {/if}
      </div>
    </div>
  {/if}

  <div class="navbar-border"></div>
</nav>

<AuthModal open={auth.modalOpen} initialMode={auth.modalMode} onclose={() => auth.closeModal()} />
<UsernameSetupModal
  open={auth.isAuthenticated && auth.needsUsernameSetup}
  onclose={() => auth.fetchProfile()}
/>

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
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #3d3428;
  }

  .mobile-auth .logout {
    color: #c46b6b;
    background: none;
    border: none;
    text-align: left;
  }

  @media (max-width: 640px) {
    .logo-text {
      display: none;
    }
  }

  /* User Menu Styles */
  .user-menu-container {
    position: relative;
  }

  .user-menu-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: rgba(60, 50, 40, 0.4);
    border: 1px solid #4a3f32;
    border-radius: 6px;
    color: #c4b8a4;
    cursor: pointer;
    transition: all 0.15s;
  }

  .user-menu-btn:hover {
    background: rgba(60, 50, 40, 0.6);
    border-color: #6b5a48;
    color: #f0e6d8;
  }

  .user-avatar-wrapper {
    position: relative;
    width: 28px;
    height: 28px;
  }

  .user-avatar {
    position: absolute;
    top: 0;
    left: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-avatar-placeholder {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(180deg, #d4a44c 0%, #a67c28 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cinzel', serif;
    font-weight: 700;
    font-size: 0.85rem;
    color: #1a1208;
  }

  .user-name {
    font-size: 0.85rem;
    font-weight: 500;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    width: 16px;
    height: 16px;
    opacity: 0.6;
  }

  .user-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 180px;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(70, 58, 42, 0.4) 0%, transparent 50%),
      linear-gradient(180deg, #2a241c 0%, #1e1a15 100%);
    border: 1px solid #4a3f32;
    border-radius: 8px;
    padding: 0.5rem;
    box-shadow:
      0 0 0 1px rgba(107, 90, 72, 0.2),
      0 10px 25px rgba(0, 0, 0, 0.4);
    z-index: 200;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.625rem 0.75rem;
    font-size: 0.85rem;
    color: #c4b8a4;
    background: none;
    border: none;
    border-radius: 4px;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s;
  }

  .dropdown-item:hover {
    background: rgba(60, 50, 40, 0.5);
    color: #f0e6d8;
  }

  .dropdown-item svg {
    width: 18px;
    height: 18px;
    opacity: 0.7;
  }

  .dropdown-item.logout {
    color: #c46b6b;
  }

  .dropdown-item.logout:hover {
    background: rgba(196, 107, 107, 0.15);
    color: #e8a0a0;
  }

  .dropdown-divider {
    height: 1px;
    background: #3d3428;
    margin: 0.5rem 0;
  }

  .dropdown-item.admin {
    color: #d4a44c;
  }

  .dropdown-item.admin:hover {
    background: rgba(212, 164, 76, 0.15);
    color: #f0d080;
  }

  .mobile-link.admin {
    color: #d4a44c;
  }
</style>
