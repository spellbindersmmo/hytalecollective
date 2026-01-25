<script>
  let { children, class: className = '', variant = 'default' } = $props()
</script>

<div class="panel {className}" class:panel-highlight={variant === 'highlight'}>
  <div class="panel-frame">
    <div class="panel-inner">
      <div class="panel-content">
        {@render children()}
      </div>
    </div>
  </div>
</div>

<style>
  .panel {
    position: relative;
    /* Performance: Isolate panel rendering to prevent repaints */
    contain: layout style paint;
  }

  .panel-frame {
    /* Outer frame - lighter wooden border */
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
  }

  .panel-inner {
    /* Inner border/bevel */
    background: linear-gradient(180deg, #3a3127 0%, #302820 100%);
    border: 1px solid #4a3f32;
    border-radius: 4px;
    padding: 2px;
    box-shadow:
      inset 0 1px 0 rgba(100, 85, 65, 0.2),
      inset 0 -1px 0 rgba(0, 0, 0, 0.15);
  }

  .panel-content {
    /* Content area with smooth mottled texture */
    position: relative;
    background:
      /* Soft warm patches */
      radial-gradient(ellipse 60% 50% at 25% 25%, rgba(75, 62, 48, 0.35) 0%, transparent 50%),
      radial-gradient(ellipse 50% 60% at 75% 70%, rgba(68, 56, 44, 0.3) 0%, transparent 45%),
      radial-gradient(ellipse 70% 40% at 60% 30%, rgba(62, 52, 40, 0.25) 0%, transparent 50%),
      /* Base gradient */
      linear-gradient(180deg, #2a241c 0%, #241f18 50%, #201b15 100%);
    border: 1px solid #3a3127;
    border-radius: 3px;
    padding: 1rem;
    box-shadow:
      inset 0 2px 6px rgba(0, 0, 0, 0.3),
      inset 0 0 20px rgba(0, 0, 0, 0.15);
  }

  .panel-highlight .panel-frame {
    border-color: #9c8465;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.4),
      0 4px 16px rgba(0, 0, 0, 0.25),
      0 0 20px rgba(212, 164, 76, 0.1),
      inset 0 1px 0 rgba(160, 140, 110, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  }
</style>
