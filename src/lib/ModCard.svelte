<script>
  let {
    title = 'Untitled Mod',
    author = 'Unknown',
    iconUrl = '',
    classification = '',
    downloads = 0,
    onclick = () => {}
  } = $props()

  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  function getClassLabel(c) {
    const labels = {
      'PLUGIN': 'Plugin',
      'DATA': 'Data Pack',
      'ART': 'Art Pack',
      'SAVE': 'Save',
      'MODPACK': 'Modpack'
    }
    return labels[c] || c
  }
</script>

<button class="card" onclick={onclick}>
  <div class="card-frame">
    <div class="card-inner">
      <div class="card-icon">
        {#if iconUrl}
          <img src={iconUrl} alt={title} onerror={(e) => e.target.style.display = 'none'} />
        {:else}
          <div class="icon-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        {/if}
      </div>

      <div class="card-content">
        <h3 class="card-title">{title}</h3>
        <p class="card-author">by {author}</p>

        <div class="card-meta">
          {#if classification}
            <span class="classification">{getClassLabel(classification)}</span>
          {/if}
          <span class="downloads">
            <svg viewBox="0 0 16 16" class="stat-icon">
              <path fill="currentColor" d="M8 12l-4 2 1-4.5L1 6l4.5-.5L8 1l2.5 4.5L15 6l-4 3.5 1 4.5z"/>
            </svg>
            {formatNumber(downloads)}
          </span>
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
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem;
    box-shadow:
      inset 0 1px 0 rgba(100, 85, 65, 0.15),
      inset 0 -1px 0 rgba(0, 0, 0, 0.15);
  }

  .card-icon {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    border-radius: 6px;
    overflow: hidden;
    background: linear-gradient(180deg, #2a241c 0%, #1a1714 100%);
    border: 1px solid #3d3428;
  }

  .card-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .icon-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6a5a4a;
  }

  .icon-placeholder svg {
    width: 28px;
    height: 28px;
  }

  .card-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .card-title {
    font-family: 'Cinzel', serif;
    font-size: 0.9rem;
    font-weight: 600;
    color: #f5d898;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .card-author {
    font-size: 0.75rem;
    color: #a89880;
    margin: 0.15rem 0 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .classification {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 2px;
    color: #c4b8a4;
  }

  .downloads {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #c4b8a4;
  }

  .stat-icon {
    width: 12px;
    height: 12px;
    color: #d4a44c;
  }
</style>
