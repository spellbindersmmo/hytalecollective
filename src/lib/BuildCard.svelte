<script>
  let {
    title = 'Untitled Build',
    author = 'Unknown',
    thumbnail = '',
    tags = [],
    downloads = 0,
    blocks = 0,
    views = 0,
    votes = 0,
    slug = '',
    onclick = null
  } = $props()

  function formatNumber(num) {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }

  function handleClick() {
    if (onclick) {
      onclick()
    } else if (slug && typeof window !== 'undefined' && window.navigate) {
      window.navigate(`build-${slug}`)
    }
  }
</script>

<button class="card" onclick={handleClick} type="button">
  <div class="card-frame">
    <div class="card-inner">
      <!-- Thumbnail area -->
      <div class="card-thumbnail">
        {#if thumbnail}
          <img
            src={thumbnail}
            alt={title}
            onerror={(e) => e.target.style.display = 'none'}
          />
        {/if}
        <div class="thumbnail-texture"></div>
        <div class="thumbnail-overlay"></div>
      </div>

      <!-- Content area -->
      <div class="card-content">
        <h3 class="card-title">{title}</h3>
        <p class="card-author">by {author}</p>

        {#if tags.length > 0}
          <div class="card-tags">
            {#each tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        {/if}

        <div class="card-stats">
          <span class="stat">
            <svg viewBox="0 0 16 16" class="stat-icon download-icon">
              <path fill="currentColor" d="M8 12L3 7h3V1h4v6h3L8 12zM1 14h14v1H1v-1z"/>
            </svg>
            {formatNumber(downloads)}
          </span>
          {#if votes > 0}
            <span class="stat">
              <svg viewBox="0 0 16 16" class="stat-icon vote-icon">
                <path fill="currentColor" d="M8 12l-4 2 1-4.5L1 6l4.5-.5L8 1l2.5 4.5L15 6l-4 3.5 1 4.5z"/>
              </svg>
              {formatNumber(votes)}
            </span>
          {/if}
          {#if views > 0}
            <span class="stat">
              <svg viewBox="0 0 24 24" class="stat-icon view-icon">
                <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              {formatNumber(views)}
            </span>
          {/if}
          {#if blocks > 0}
            <span class="stat">
              <svg viewBox="0 0 16 16" class="stat-icon">
                <rect fill="currentColor" x="2" y="2" width="12" height="12" rx="1"/>
              </svg>
              {formatNumber(blocks)}
            </span>
          {/if}
        </div>
      </div>
    </div>
  </div>
</button>

<style>
  .card {
    cursor: pointer;
    transition: transform 0.2s ease;
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    width: 100%;
  }

  .card:hover {
    transform: translateY(-3px);
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

  .card:hover .card-frame {
    border-color: #9c8465;
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.5),
      0 8px 24px rgba(0, 0, 0, 0.35),
      0 0 30px rgba(212, 164, 76, 0.12),
      inset 0 1px 0 rgba(160, 140, 110, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  }

  .card-inner {
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 rgba(100, 85, 65, 0.15),
      inset 0 -1px 0 rgba(0, 0, 0, 0.15);
  }

  .card-thumbnail {
    position: relative;
    aspect-ratio: 16 / 10;
    min-height: 160px;
    background:
      radial-gradient(ellipse at 30% 40%, rgba(55, 46, 35, 0.6) 0%, transparent 60%),
      radial-gradient(ellipse at 70% 60%, rgba(48, 40, 30, 0.5) 0%, transparent 50%),
      linear-gradient(180deg, #2a241c 0%, #1a1714 100%);
    overflow: hidden;
  }

  .card-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .card:hover .card-thumbnail img {
    transform: scale(1.05);
  }

  .thumbnail-texture {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse 60% 50% at 30% 40%, rgba(65, 55, 42, 0.25) 0%, transparent 50%),
      radial-gradient(ellipse 50% 60% at 70% 60%, rgba(55, 46, 35, 0.2) 0%, transparent 45%);
  }

  .thumbnail-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 40%, rgba(26, 23, 20, 0.85) 100%);
    pointer-events: none;
  }

  .card-content {
    position: relative;
    padding: 0.75rem;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(65, 55, 42, 0.25) 0%, transparent 70%),
      linear-gradient(180deg, #2a241c 0%, #221d17 100%);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.25);
  }

  .card-title {
    position: relative;
    font-family: 'Cinzel', serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .card-author {
    position: relative;
    font-size: 0.75rem;
    color: #c4b8a4;
    margin: 0.2rem 0 0 0;
  }

  .card-tags {
    position: relative;
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

  .card-stats {
    position: relative;
    display: flex;
    gap: 0.75rem;
    margin-top: 0.6rem;
    padding-top: 0.5rem;
    border-top: 1px solid #3a3127;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: #c4b8a4;
  }

  .stat-icon {
    width: 12px;
    height: 12px;
    color: #8a7a6a;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
  }

  .stat-icon.vote-icon {
    color: #d4a44c;
  }

  .stat-icon.download-icon {
    color: #6bb8cc;
  }

  .stat-icon.view-icon {
    color: #a89880;
  }
</style>
