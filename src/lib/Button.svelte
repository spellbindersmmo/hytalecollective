<script>
  let {
    children,
    variant = 'primary',
    class: className = '',
    onclick = null,
    href = null,
    disabled = false,
    type = 'button'
  } = $props()
</script>

{#if href}
  <a {href} class="btn btn-{variant} {className}" class:disabled>
    {@render children()}
  </a>
{:else}
  <button {onclick} class="btn btn-{variant} {className}" {disabled} {type}>
    {@render children()}
  </button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1.25rem;
    font-family: 'Cinzel', serif;
    font-weight: 600;
    font-size: 0.9rem;
    letter-spacing: 0.03em;
    text-align: center;
    text-decoration: none;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn :global(svg) {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .btn-primary {
    background: linear-gradient(180deg, #e8c36b 0%, #c49a3a 50%, #a67c28 100%);
    border: 2px solid #8b6914;
    color: #1a1208;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .btn-primary:hover {
    background: linear-gradient(180deg, #f0d080 0%, #d4a844 50%, #b88830 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 2px 8px rgba(212, 164, 76, 0.4);
  }

  .btn-primary:active {
    transform: translateY(1px);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .btn-secondary {
    background: linear-gradient(180deg, #4d4235 0%, #3a3127 100%);
    border: 2px solid #6b5a48;
    color: #f0e6d8;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 2px 4px rgba(0, 0, 0, 0.25);
  }

  .btn-secondary:hover {
    background: linear-gradient(180deg, #5a4d3e 0%, #453a2e 100%);
    border-color: #9c8465;
    color: #f5d898;
  }

  .btn-secondary:active {
    transform: translateY(1px);
  }

  .btn-ghost {
    background: transparent;
    border: 2px solid transparent;
    color: #c4b8a4;
    box-shadow: none;
  }

  .btn-ghost:hover {
    color: #f5d898;
    background: rgba(107, 90, 72, 0.3);
    border-color: #4a3f32;
  }

  .btn-danger {
    background: linear-gradient(180deg, #c46b6b 0%, #a04545 50%, #8a3535 100%);
    border: 2px solid #6b2a2a;
    color: #fff;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .btn-danger:hover {
    background: linear-gradient(180deg, #d47a7a 0%, #b05555 50%, #9a4545 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 2px 8px rgba(196, 107, 107, 0.4);
  }

  .btn-danger:active {
    transform: translateY(1px);
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .btn:disabled,
  .btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
</style>
