<script>
  let {
    name = 'Unnamed Server',
    description = '',
    players = 0,
    maxPlayers = 100,
    tags = [],
    online = true
  } = $props()
</script>

<div class="server-card">
  <div class="card-frame">
    <div class="card-inner">
      <div class="card-content">
        <div class="server-main">
          <div class="server-header">
            <span class="status-dot" class:online></span>
            <h3 class="server-name">{name}</h3>
          </div>

          {#if description}
            <p class="server-desc">{description}</p>
          {/if}

          {#if tags.length > 0}
            <div class="server-tags">
              {#each tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}
        </div>

        <div class="server-stats">
          <div class="player-count" class:online>
            {players}/{maxPlayers}
          </div>
          <div class="player-label">players</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .server-card {
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .server-card:hover {
    transform: translateY(-2px);
  }

  .card-frame {
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
  }

  .card-content {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background:
      radial-gradient(ellipse 50% 60% at 20% 30%, rgba(65, 55, 42, 0.25) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 80% 70%, rgba(58, 48, 38, 0.2) 0%, transparent 50%),
      linear-gradient(180deg, #2a241c 0%, #221d17 100%);
    border-radius: 3px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25);
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

  .server-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.5rem;
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

  .server-stats {
    position: relative;
    text-align: right;
    flex-shrink: 0;
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
</style>
