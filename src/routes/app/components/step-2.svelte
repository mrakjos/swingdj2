<script>
  let {
    durationLimitMinutes = $bindable(),
    percentByPlaylist = $bindable(),
    selectedPlaylists,
    sumPercent,
    onClampPercent,
    onDistributeEvenly
  } = $props();
</script>

<div>
  <h2>Step 2/3: Set playlist percentages</h2>
  <p>
    Set how much each playlist should contribute. (Sum must be ≤ 100%. Any remainder can be filled
    from leftovers.)
  </p>

  <div style="display:flex; gap: 18px; flex-wrap: wrap; align-items:end; margin: 14px 0;">
    <label>
      Duration limit (minutes)
      <input
        type="number"
        min="1"
        bind:value={durationLimitMinutes}
        style="display:block; width: 180px; padding: 8px; margin-top: 6px;"
      />
    </label>

    <button type="button" onclick={onDistributeEvenly}>Distribute evenly</button>
  </div>

  <div style="display:grid; gap: 10px; max-width: 760px;">
    {#each selectedPlaylists as p}
      <div
        style="display:grid; grid-template-columns: 1fr 140px; gap: 12px; align-items:center; padding: 10px; border: 1px solid #eee; border-radius: 12px;"
      >
        <div>
          <b>{p.name}</b>
          <div><small>{p.tracks.total} tracks</small></div>
        </div>

        <label style="display:flex; align-items:center; gap: 8px; justify-content:flex-end;">
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            bind:value={percentByPlaylist[p.id]}
            onblur={() => onClampPercent(p.id)}
            style="width: 90px; padding: 8px;"
          />
          <span>%</span>
        </label>
      </div>
    {/each}
  </div>

  <div style="margin-top: 14px; display:flex; gap: 12px; align-items:center;">
    <b>Sum:</b>
    <span style="font-variant-numeric: tabular-nums;">{sumPercent}%</span>
    {#if sumPercent > 100}
      <span style="color:#b00020;">(over 100%)</span>
    {/if}
  </div>
</div>
