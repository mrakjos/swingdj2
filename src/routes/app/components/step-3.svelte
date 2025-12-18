<script lang="ts">
  import { addTracksToPlaylist, createPlaylist } from '$lib/spotify/api';

  let {
    status = $bindable(),
    createdUrl = $bindable(),
    token,
    me,
    playlists,
    durationLimitMinutes,
    previewTotalMs,
    previewTracks,
    isPublic,
    newName
  } = $props();

  let isCreating = $state(false);

  async function createFromPreview() {
    if (!token || !me) {
      return;
    }
    if (previewTracks.length === 0) {
      status = 'No preview tracks to create from.';
      return;
    }

    isCreating = true;
    createdUrl = null;

    try {
      status = 'Creating playlist…';
      const created = await createPlaylist(
        token,
        me.id,
        newName.trim() || `SwingDJ ${new Date().toISOString().substring(0, 10)}`,
        `Random pick with duration cap ${durationLimitMinutes} min`,
        isPublic
      );

      status = `Adding ${previewTracks.length} tracks…`;
      await addTracksToPlaylist(
        token,
        created.id,
        previewTracks.map((t) => t.uri)
      );

      createdUrl = created.external_urls.spotify;
      status = 'Done!';
    } catch (e: any) {
      status = e?.message ?? String(e);
    } finally {
      isCreating = false;
    }
  }

  function msToMinSec(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function playlistName(id: string) {
    return playlists.find((p) => p.id === id)?.name ?? id;
  }
</script>

<div>
  <h2>Step 3/3: Preview selected songs</h2>
  <p>
    Tracks: <b>{previewTracks.length}</b> · Total duration: <b>{msToMinSec(previewTotalMs)}</b>
    (cap: {durationLimitMinutes} min)
  </p>

  <div style="margin-top: 12px; border: 1px solid #eee; border-radius: 12px; overflow:hidden;">
    <div style="padding: 10px 12px; background:#fafafa; border-bottom:1px solid #eee;">
      <b>Song list</b>
    </div>

    <div style="max-height: 480px; overflow:auto;">
      {#each previewTracks as t, idx}
        <div
          style="display:grid; grid-template-columns: 42px 1fr 140px 120px; gap: 10px; padding: 10px 12px; border-bottom: 1px solid #f1f1f1;"
        >
          <div style="text-align:right; font-variant-numeric: tabular-nums;">{idx + 1}</div>
          <div>
            <div><b>{t.name}</b></div>
            <div><small>{t.artists.join(', ')}</small></div>
          </div>
          <div><small>{playlistName(t.sourcePlaylistId)}</small></div>
          <div style="text-align:right; font-variant-numeric: tabular-nums;">
            {msToMinSec(t.duration_ms)}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div style="margin-top: 20px">
    <button onclick={createFromPreview} disabled={isCreating}>
      {isCreating ? 'Creating…' : 'Create playlist'}
    </button>

    {#if createdUrl}
      <div>Created: <a href={createdUrl} target="_blank" rel="noreferrer">{createdUrl}</a></div>
    {/if}
  </div>
</div>
