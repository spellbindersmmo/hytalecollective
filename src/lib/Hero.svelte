<script>
  import { onMount } from 'svelte'
  import Button from './Button.svelte'
  import { supabase } from './supabase.js'

  let { onnavigate = () => {} } = $props()

  let stats = $state({ builds: 0, servers: 0, users: 0 })

  onMount(async () => {
    try {
      const [
        { count: buildsCount },
        { count: serversCount },
        { count: usersCount }
      ] = await Promise.all([
        supabase.from('builds').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('servers').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
      ])

      stats = {
        builds: buildsCount || 0,
        servers: serversCount || 0,
        users: usersCount || 0
      }
    } catch (e) {
      console.error('Error fetching stats:', e)
    }
  })

  function formatNumber(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
    }
    return num.toString()
  }
</script>

<section class="hero">
  <div class="hero-bg">
    <div class="hero-texture"></div>
    <div class="hero-glow"></div>
    <div class="hero-vignette"></div>
  </div>

  <div class="hero-content">
    <h1 class="hero-title">
      Welcome to the
      <span class="title-highlight">Hytale Collective</span>
    </h1>

    <p class="hero-subtitle">
      Your community hub for sharing builds, discovering worlds, finding servers, and connecting with fellow adventurers.
    </p>

    <div class="hero-cta">
      <Button variant="primary" onclick={() => onnavigate('builds')}>Explore Builds</Button>
      <Button variant="secondary" onclick={() => onnavigate('servers')}>Find Servers</Button>
    </div>

    <div class="hero-stats">
      <div class="stat">
        <div class="stat-value gold">{formatNumber(stats.builds)}</div>
        <div class="stat-label">Builds</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <div class="stat-value green">{formatNumber(stats.servers)}</div>
        <div class="stat-label">Servers</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <div class="stat-value">{formatNumber(stats.users)}</div>
        <div class="stat-label">Members</div>
      </div>
    </div>
  </div>

  <div class="hero-border"></div>
</section>

<style>
  .hero {
    position: relative;
    padding: 2.5rem 1.5rem;
    overflow: hidden;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
  }

  .hero-texture {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 50% at 20% 30%, rgba(75, 62, 46, 0.35) 0%, transparent 50%),
      radial-gradient(ellipse 60% 70% at 80% 60%, rgba(68, 56, 42, 0.3) 0%, transparent 45%),
      radial-gradient(ellipse 50% 40% at 50% 80%, rgba(62, 52, 38, 0.25) 0%, transparent 50%);
    pointer-events: none;
  }

  .hero-glow {
    position: absolute;
    top: -30%;
    left: 50%;
    transform: translateX(-50%);
    width: 120%;
    height: 80%;
    background: radial-gradient(ellipse at center, rgba(212, 164, 76, 0.12) 0%, transparent 50%);
    pointer-events: none;
  }

  .hero-vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 30%, rgba(70, 58, 44, 0.4) 0%, transparent 40%),
      radial-gradient(ellipse at 80% 70%, rgba(62, 52, 40, 0.35) 0%, transparent 35%),
      radial-gradient(ellipse at center, transparent 40%, rgba(20, 16, 12, 0.5) 100%);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    max-width: 48rem;
    margin: 0 auto;
    text-align: center;
  }

  .hero-title {
    font-size: 2rem;
    font-weight: 700;
    color: #f0e6d8;
    margin: 0 0 0.75rem 0;
    line-height: 1.2;
    text-shadow:
      0 2px 4px rgba(0, 0, 0, 0.4),
      0 4px 8px rgba(0, 0, 0, 0.25);
  }

  @media (min-width: 640px) {
    .hero-title {
      font-size: 2.5rem;
    }
  }

  .title-highlight {
    display: block;
    background: linear-gradient(180deg, #f0d090 0%, #d4a44c 50%, #b8893a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }

  .hero-subtitle {
    font-size: 1rem;
    color: #c4b8a4;
    margin: 0 0 1.25rem 0;
    max-width: 36rem;
    margin-left: auto;
    margin-right: auto;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .hero-cta {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
  }

  @media (min-width: 480px) {
    .hero-cta {
      flex-direction: row;
    }
  }

  .hero-stats {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  @media (min-width: 640px) {
    .hero-stats {
      gap: 2rem;
    }
  }

  .stat {
    text-align: center;
  }

  .stat-value {
    font-family: 'Cinzel', serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #f0e6d8;
    text-shadow:
      0 2px 4px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(240, 230, 216, 0.1);
  }

  @media (min-width: 640px) {
    .stat-value {
      font-size: 2.25rem;
    }
  }

  .stat-value.gold {
    color: #d4a44c;
    text-shadow:
      0 2px 4px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(212, 164, 76, 0.2);
  }

  .stat-value.blue {
    color: #5ba3b5;
    text-shadow:
      0 2px 4px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(91, 163, 181, 0.2);
  }

  .stat-value.green {
    color: #6d9e6a;
    text-shadow:
      0 2px 4px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(109, 158, 106, 0.2);
  }

  .stat-label {
    font-size: 0.8rem;
    color: #c4b8a4;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 0.25rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .stat-divider {
    display: none;
    width: 1px;
    height: 50px;
    background: linear-gradient(180deg, transparent, #6b5a48, transparent);
    box-shadow: 1px 0 0 rgba(0, 0, 0, 0.25);
  }

  @media (min-width: 640px) {
    .stat-divider {
      display: block;
    }
  }

  .hero-border {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background:
      linear-gradient(90deg,
        transparent 0%,
        #4a3f32 10%,
        #6b5a48 30%,
        #7c6a56 50%,
        #6b5a48 70%,
        #4a3f32 90%,
        transparent 100%
      );
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.4),
      0 -1px 0 rgba(120, 100, 78, 0.2);
  }
</style>
