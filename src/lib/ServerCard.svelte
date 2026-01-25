<script>
  let {
    name = 'Unnamed Server',
    slug = '',
    description = '',
    players = 0,
    maxPlayers = 100,
    tags = [],
    online = true,
    icon = null,
    banner = null,
    source = 'community',
    votes = 0,
    onclick = null
  } = $props()

  // Source badge configuration
  const sourceConfig = {
    community: { label: 'Community', color: '#6bb8cc' },
    official: { label: 'Official', color: '#d4a44c' },
    partner: { label: 'Partner', color: '#9b6dc6' }
  }

  const sourceBadge = sourceConfig[source] || sourceConfig.community

  function handleClick() {
    if (onclick) {
      onclick()
    } else if (slug && typeof window !== 'undefined' && window.navigate) {
      window.navigate(`server-${slug}`)
    }
  }
</script>

<button class="server-card" onclick={handleClick} type="button">
  <div class="card-frame">
    <div class="card-inner">
      <div class="card-banner">
        {#if banner}
          <img src={banner} alt="{name} banner" />
        {/if}
        <div class="banner-overlay"></div>
      </div>
      <div class="card-content has-banner">
        <div class="server-main">
          <div class="server-header">
            {#if icon}
              <img src={icon} alt="{name} icon" class="server-icon" />
            {:else}
              <span class="status-dot" class:online></span>
            {/if}
            <h3 class="server-name">{name}</h3>
          </div>

          {#if description}
            <p class="server-desc">{description}</p>
          {/if}

          <div class="server-meta">
            {#if tags.length > 0}
              <div class="server-tags">
                {#each tags.slice(0, 3) as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            {/if}

            <div class="source-badge" style="--badge-color: {sourceBadge.color}">
              {sourceBadge.label}
            </div>
          </div>
        </div>

        <div class="server-stats">
          <div class="stat-row">
            <span class="status-indicator" class:online></span>
            <span class="player-count" class:online>
              {players}/{maxPlayers}
            </span>
          </div>
          <div class="player-label">players</div>

          {#if votes > 0}
            <div class="votes">
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {votes}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</button>

<style>
  .server-card {
    cursor: pointer;
    transition: transform 0.2s ease;
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    width: 100%;
  }

  .server-card:hover {
    transform: translateY(-2px);
  }

  .card-frame {
    width: 100%;
    box-sizing: border-box;
    background:
      linear-gradient(180deg,
        #5a4d3e 0%,
        #4d4235 15%,
        #453a2e 50%,
        #3a3127 85%,
        #322a22 100%
      );
    border: 1px solid #6b5a48;
    border-radius: 6px;
    padding: 4px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.4),
      0 4px 16px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(160, 140, 110, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);
    transition: all 0.2s ease;
  }

  .server-card:hover .card-frame {
    border-color: #6bb8cc;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.5),
      0 8px 24px rgba(0, 0, 0, 0.35),
      0 0 25px rgba(107, 184, 204, 0.12),
      inset 0 1px 0 rgba(160, 140, 110, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  }

  .card-inner {
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    box-shadow:
      inset 0 1px 0 rgba(100, 85, 65, 0.15),
      inset 0 -1px 0 rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .card-banner {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: linear-gradient(135deg, #2a241c 0%, #1e1a15 100%);
  }

  .card-banner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  .banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 30%, rgba(42, 36, 28, 0.9) 100%);
  }

  .card-content {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    height: 11rem;
    overflow: hidden;
    background:
      radial-gradient(ellipse 50% 60% at 20% 30%, rgba(65, 55, 42, 0.25) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 80% 70%, rgba(58, 48, 38, 0.2) 0%, transparent 50%),
      linear-gradient(180deg, #2a241c 0%, #221d17 100%);
    border-radius: 3px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25);
  }

  .card-content.has-banner {
    margin-top: -20px;
    border-radius: 0 0 3px 3px;
  }

  .server-main {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .server-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .server-icon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    object-fit: cover;
    border: 1px solid #4a3f32;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #d47878, #c46b6b);
    box-shadow:
      0 0 8px #c46b6b,
      inset 0 1px 2px rgba(255, 255, 255, 0.2);
  }

  .status-dot.online {
    background: radial-gradient(circle at 30% 30%, #98d496, #7ec47b);
    box-shadow:
      0 0 8px #7ec47b,
      inset 0 1px 2px rgba(255, 255, 255, 0.2);
  }

  .server-name {
    font-family: 'Cinzel', serif;
    font-size: 1rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .server-desc {
    font-size: 0.85rem;
    color: #c4b8a4;
    margin: 0.5rem 0 0 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .server-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .server-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .tag {
    padding: 0.1rem 0.4rem;
    font-size: 0.65rem;
    font-weight: 500;
    color: #c4b8a4;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 2px;
    box-shadow: inset 0 1px 0 rgba(100, 85, 65, 0.1);
  }

  .source-badge {
    padding: 0.1rem 0.4rem;
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--badge-color);
    background: color-mix(in srgb, var(--badge-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--badge-color) 40%, transparent);
    border-radius: 2px;
  }

  .server-stats {
    position: relative;
    text-align: right;
    flex-shrink: 0;
  }

  .stat-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.35rem;
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c46b6b;
  }

  .status-indicator.online {
    background: #7ec47b;
  }

  .player-count {
    font-family: 'Cinzel', serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #c46b6b;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .player-count.online {
    color: #6bb8cc;
  }

  .player-label {
    font-size: 0.7rem;
    color: #c4b8a4;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .votes {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem;
    margin-top: 0.35rem;
    font-size: 0.75rem;
    color: #d4a44c;
  }

  .votes svg {
    width: 12px;
    height: 12px;
  }
</style>
