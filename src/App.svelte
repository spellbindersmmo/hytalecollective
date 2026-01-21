<script>
  import Navbar from './lib/Navbar.svelte'
  import Hero from './lib/Hero.svelte'
  import Footer from './lib/Footer.svelte'
  import Panel from './lib/Panel.svelte'
  import Button from './lib/Button.svelte'
  import BuildCard from './lib/BuildCard.svelte'
  import ServerCard from './lib/ServerCard.svelte'
  import ForumPost from './lib/ForumPost.svelte'

  // Sample data for featured builds
  const featuredBuilds = [
    {
      title: 'Medieval Castle Keep',
      author: 'DragonBuilder',
      thumbnail: '',
      tags: ['Medieval', 'Castle'],
      downloads: 3420,
      blocks: 15600
    },
    {
      title: 'Elven Treehouse Village',
      author: 'NatureCrafter',
      thumbnail: '',
      tags: ['Fantasy', 'Village'],
      downloads: 2890,
      blocks: 8900
    },
    {
      title: 'Steampunk Airship',
      author: 'GearMaster',
      thumbnail: '',
      tags: ['Steampunk', 'Vehicle'],
      downloads: 4100,
      blocks: 12300
    },
    {
      title: 'Ancient Temple Ruins',
      author: 'HistoryBuff',
      thumbnail: '',
      tags: ['Ancient', 'Ruins'],
      downloads: 1850,
      blocks: 7200
    }
  ]

  // Sample data for featured worlds
  const featuredWorlds = [
    {
      title: 'Emerald Isles',
      author: 'WorldForge',
      thumbnail: '',
      tags: ['Adventure', 'Islands'],
      downloads: 8920,
      blocks: 0
    },
    {
      title: 'Frozen Wastelands',
      author: 'IceCrafter',
      thumbnail: '',
      tags: ['Survival', 'Winter'],
      downloads: 5640,
      blocks: 0
    },
    {
      title: 'Desert Kingdoms',
      author: 'SandMaster',
      thumbnail: '',
      tags: ['RPG', 'Desert'],
      downloads: 7230,
      blocks: 0
    },
    {
      title: 'Mystic Forests',
      author: 'EnchantedOne',
      thumbnail: '',
      tags: ['Exploration', 'Magic'],
      downloads: 6100,
      blocks: 0
    }
  ]

  // Sample data for servers
  const featuredServers = [
    {
      name: 'Hytale Realms',
      description: 'The largest community server with survival, creative, and minigames.',
      players: 847,
      maxPlayers: 1000,
      tags: ['Survival', 'Minigames', 'Creative'],
      online: true
    },
    {
      name: 'PvP Arena',
      description: 'Competitive PvP server with ranked matches and tournaments.',
      players: 234,
      maxPlayers: 500,
      tags: ['PvP', 'Competitive'],
      online: true
    },
    {
      name: 'Builder\'s Paradise',
      description: 'Creative server focused on collaborative building projects.',
      players: 156,
      maxPlayers: 200,
      tags: ['Creative', 'Building'],
      online: true
    },
    {
      name: 'RPG Adventures',
      description: 'Custom RPG experience with quests, dungeons, and progression.',
      players: 0,
      maxPlayers: 300,
      tags: ['RPG', 'Adventure'],
      online: false
    }
  ]

  // Sample data for forum posts
  const recentPosts = [
    {
      title: 'Tips for building realistic medieval structures',
      author: 'ArchitectPro',
      category: 'Showcase',
      replies: 42,
      views: 1250,
      lastActivity: '2 hours ago'
    },
    {
      title: 'Best mods for enhanced gameplay?',
      author: 'ModEnthusiast',
      category: 'Help',
      replies: 28,
      views: 890,
      lastActivity: '4 hours ago'
    },
    {
      title: 'Weekly building challenge: Fantasy Tavern',
      author: 'CommunityMod',
      category: 'News',
      replies: 67,
      views: 2100,
      lastActivity: '1 hour ago'
    },
    {
      title: 'What features are you most excited about?',
      author: 'HytaleFan2024',
      category: 'Discussion',
      replies: 156,
      views: 4500,
      lastActivity: '30 mins ago'
    },
    {
      title: 'Server hosting recommendations',
      author: 'AdminHelper',
      category: 'Help',
      replies: 19,
      views: 620,
      lastActivity: '6 hours ago'
    }
  ]
</script>

<div class="app">
  <Navbar currentPage="home" />

  <main>
    <Hero />

    <!-- Featured Builds Section -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Featured Builds</h2>
            <p class="section-subtitle">Discover amazing creations from the community</p>
          </div>
          <Button variant="secondary" href="/builds">View All</Button>
        </div>

        <div class="card-grid">
          {#each featuredBuilds as build}
            <BuildCard {...build} />
          {/each}
        </div>
      </div>
    </section>

    <!-- Featured Worlds Section -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Popular Worlds</h2>
            <p class="section-subtitle">Download and explore custom worlds</p>
          </div>
          <Button variant="secondary" href="/worlds">View All</Button>
        </div>

        <div class="card-grid">
          {#each featuredWorlds as world}
            <BuildCard {...world} />
          {/each}
        </div>
      </div>
    </section>

    <!-- Servers Section -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Active Servers</h2>
            <p class="section-subtitle">Find a server and start playing</p>
          </div>
          <Button variant="secondary" href="/servers">View All</Button>
        </div>

        <div class="server-grid">
          {#each featuredServers as server}
            <ServerCard {...server} />
          {/each}
        </div>
      </div>
    </section>

    <!-- Forum Preview Section -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-header">
          <div>
            <h2 class="section-title">Community Forum</h2>
            <p class="section-subtitle">Join the conversation</p>
          </div>
          <Button variant="secondary" href="/forum">Visit Forum</Button>
        </div>

        <Panel>
          <div class="forum-list">
            {#each recentPosts as post, i}
              {#if i > 0}
                <div class="forum-divider"></div>
              {/if}
              <ForumPost {...post} />
            {/each}
          </div>
        </Panel>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="section cta-section">
      <div class="container">
        <Panel>
          <div class="cta-content">
            <h2 class="cta-title">Ready to Share Your Creations?</h2>
            <p class="cta-text">
              Join thousands of builders and adventurers. Upload your builds, share your worlds, and become part of the community.
            </p>
            <div class="cta-buttons">
              <Button variant="primary">Create Account</Button>
              <Button variant="secondary">Learn More</Button>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  </main>

  <Footer />
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
  }

  .section {
    position: relative;
    padding: 4rem 1.5rem;
  }

  .section-alt {
    background:
      radial-gradient(ellipse 80% 60% at 25% 30%, rgba(58, 48, 36, 0.4) 0%, transparent 50%),
      radial-gradient(ellipse 70% 70% at 75% 70%, rgba(52, 42, 32, 0.35) 0%, transparent 45%),
      radial-gradient(ellipse 50% 40% at 50% 50%, rgba(62, 52, 40, 0.25) 0%, transparent 50%),
      linear-gradient(180deg, rgba(22, 18, 14, 0.8) 0%, rgba(18, 15, 12, 0.85) 50%, rgba(22, 18, 14, 0.8) 100%);
  }

  .container {
    max-width: 80rem;
    margin: 0 auto;
  }

  .section-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  @media (min-width: 640px) {
    .section-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .section-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0;
  }

  .section-subtitle {
    font-size: 0.95rem;
    color: #c4b8a4;
    margin: 0.25rem 0 0 0;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1.5rem;
  }

  @media (min-width: 640px) {
    .card-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .card-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .server-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .server-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .forum-list {
    display: flex;
    flex-direction: column;
  }

  .forum-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #4a3f32, transparent);
    margin: 0.5rem 0;
  }

  .cta-section {
    padding: 5rem 1.5rem;
  }

  .cta-content {
    text-align: center;
    padding: 2rem 1rem;
  }

  @media (min-width: 640px) {
    .cta-content {
      padding: 3rem 2rem;
    }
  }

  .cta-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f5d898;
    margin: 0 0 1rem 0;
  }

  @media (min-width: 640px) {
    .cta-title {
      font-size: 2rem;
    }
  }

  .cta-text {
    font-size: 1rem;
    color: #c4b8a4;
    margin: 0 0 2rem 0;
    max-width: 32rem;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
  }

  @media (min-width: 480px) {
    .cta-buttons {
      flex-direction: row;
    }
  }
</style>
