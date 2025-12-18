<script>
  let { playlists, selected, onToggle } = $props();
</script>

<div>
  <h2>Step 1/3: Select playlists</h2>
  <p>Select at least 2 playlists.</p>

  <div
    style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 10px;"
  >
    {#each playlists as p}
      <button
        type="button"
        onclick={() => onToggle(p.id)}
        style="
              text-align:left; padding: 12px; border-radius: 12px;
              border: 1px solid #ddd;
              background: {selected.has(p.id) ? '#f0f7ff' : 'white'};
              cursor: pointer;
            "
      >
        <div style="display:flex; justify-content:space-between; gap: 10px;">
          <b>{p.name}</b>
          <span>{p.tracks.total} tracks</span>
        </div>
        <small>{p.id}</small>
      </button>
    {/each}
  </div>
</div>
