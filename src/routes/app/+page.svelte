<script lang="ts">
  import { getAllPlaylistTracks } from '$lib/spotify/api';

  import type { PageProps } from './$types';
  import type { Track } from './types';

  import Step1 from './components/step-1.svelte';
  import Step2 from './components/step-2.svelte';
  import Step3 from './components/step-3.svelte';

  type Playlist = { id: string; name: string; tracks: { total: number } };

  // let token: string | null = null;
  // let me: { id: string; display_name: string } | null = null;
  // let playlists: Playlist[] = [];
  type PropsData = {
    token: string | null;
    me: { id: string; display_name: string } | null;
    playlists: Playlist[];
  };

  let { data }: PageProps = $props();
  const { token, me, playlists }: PropsData = data;

  let selected = $state(new Set<string>());

  // wizard step: 1 select playlists, 2 set percentages, 3 preview songs + create
  let step: 1 | 2 | 3 = $state(1);

  // step 2 inputs
  let durationLimitMinutes = $state(180); // global duration cap
  let percentByPlaylist: Record<string, number> = $state({}); // playlistId -> percent

  // step 3 preview
  let previewTracks: Track[] = $state([]);
  let previewTotalMs = $state(0);

  // final create
  let newName = $state(`SwingDJ ${new Date().toISOString().substring(0, 10)}`);
  let status = $state('');
  let isPublic = $state(false);
  let createdUrl: string | null = $state(null);

  function togglePlaylist(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selected = next;

    // keep percent map tidy when user goes back and changes selection
    if (!selected.has(id)) {
      const { [id]: _, ...rest } = percentByPlaylist;
      percentByPlaylist = rest;
    }
  }

  // --- Step 2 helpers ---
  function selectedPlaylists(): Playlist[] {
    const set = selected;
    return playlists.filter((p) => set.has(p.id));
  }

  function sumPercent() {
    return selectedPlaylists().reduce((acc, p) => acc + (Number(percentByPlaylist[p.id]) || 0), 0);
  }

  function clampPercent(id: string) {
    const v = Number(percentByPlaylist[id] ?? 0);
    percentByPlaylist = {
      ...percentByPlaylist,
      [id]: Math.max(0, Math.min(100, isFinite(v) ? v : 0))
    };
  }

  function distributeEvenly() {
    const sel = selectedPlaylists();

    if (sel.length === 0) {
      return;
    }

    const each = Math.floor(100 / sel.length);
    const remainder = 100 - each * sel.length;

    const next: Record<string, number> = {};
    sel.forEach((p, idx) => {
      next[p.id] = each + (idx < remainder ? 1 : 0);
    });
    percentByPlaylist = next;
  }

  function goToStep2() {
    if (selected.size < 2) {
      status = 'Pick at least 2 playlists.';
      return;
    }
    status = '';
    step = 2;
    createdUrl = null;

    // initialize missing percents (default: even distribution, but only if nothing is set yet)
    const sel = selectedPlaylists();
    const hasAny = sel.some((p) => percentByPlaylist[p.id] != null);
    if (!hasAny) {
      distributeEvenly();
    } else {
      // ensure all selected have a value
      const next = { ...percentByPlaylist };
      for (const p of sel) if (next[p.id] == null) next[p.id] = 0;
      percentByPlaylist = next;
    }
  }

  function goBackToStep(nextStep: 1 | 2 | 3) {
    status = '';
    step = nextStep;
  }

  function shuffleInPlace<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    console.log('SHUFFLE', arr);

    return arr;
  }

  /**
   * Build a random track list that:
   * - dedupes by URI across playlists
   * - tries to respect per-playlist % shares (by *track count* quota)
   * - never exceeds duration cap
   *
   * Approach:
   * 1) dedupe within each playlist first
   * 2) estimate average duration across all unique candidates
   * 3) derive target total track count = floor(capMs / avgMs)
   * 4) per playlist quota = round(targetTotal * percent/100)
   * 5) pick randomly per playlist up to quota, fitting duration
   * 6) fill remaining duration with random leftovers from all playlists
   */
  function buildPreview(opts: {
    tracksByPlaylist: Map<string, Track[]>;
    playlistOrder: string[];
    percentByPlaylist: Record<string, number>;
    capMs: number;
  }) {
    const { tracksByPlaylist, playlistOrder, percentByPlaylist, capMs } = opts;

    // dedupe within each playlist
    const uniqueByPlaylist = new Map<string, Track[]>();
    const allUniqueForAvg: Track[] = [];
    for (const pid of playlistOrder) {
      const list = tracksByPlaylist.get(pid) ?? [];
      const seen = new Set<string>();
      const uniq: Track[] = [];
      for (const t of list) {
        if (seen.has(t.uri)) {
          continue;
        }
        seen.add(t.uri);
        uniq.push(t);
      }
      uniqueByPlaylist.set(pid, uniq);
      allUniqueForAvg.push(...uniq);
    }

    // if no candidates
    if (allUniqueForAvg.length === 0) return { picked: [] as Track[], totalMs: 0 };

    // estimate avg duration
    const avgMs = Math.max(
      1,
      Math.round(allUniqueForAvg.reduce((a, t) => a + t.duration_ms, 0) / allUniqueForAvg.length)
    );

    const targetTotalTracks = Math.max(1, Math.floor(capMs / avgMs));

    // compute quotas
    const quotas = new Map<string, number>();
    for (const pid of playlistOrder) {
      const pct = Math.max(0, Number(percentByPlaylist[pid] ?? 0));
      quotas.set(pid, Math.max(0, Math.round((targetTotalTracks * pct) / 100)));
    }

    // pick per playlist
    const picked: Track[] = [];
    const pickedUris = new Set<string>();
    let totalMs = 0;

    for (const pid of playlistOrder) {
      const quota = quotas.get(pid) ?? 0;
      if (quota <= 0) {
        continue;
      }

      const candidates = [...(uniqueByPlaylist.get(pid) ?? [])];
      shuffleInPlace(candidates);

      let used = 0;
      for (const t of candidates) {
        if (used >= quota) {
          break;
        }
        if (pickedUris.has(t.uri)) {
          continue;
        }
        if (!t.duration_ms || totalMs + t.duration_ms > capMs) {
          continue;
        }

        picked.push(t);
        pickedUris.add(t.uri);
        totalMs += t.duration_ms;
        used++;
      }
    }

    // fill remaining duration with any leftovers (global shuffle)
    const leftovers: Track[] = [];
    for (const pid of playlistOrder) {
      for (const t of uniqueByPlaylist.get(pid) ?? []) {
        if (!pickedUris.has(t.uri)) {
          leftovers.push(t);
        }
      }
    }
    shuffleInPlace(leftovers);

    for (const t of leftovers) {
      if (!t.duration_ms || totalMs + t.duration_ms > capMs) {
        continue;
      }

      picked.push(t);
      pickedUris.add(t.uri);
      totalMs += t.duration_ms;

      if (totalMs >= capMs) {
        break;
      }
    }

    return { picked, totalMs };
  }

  async function goToStep3GeneratePreview() {
    if (!token || !me) {
      return;
    }

    const sel = selectedPlaylists();
    if (sel.length < 2) {
      status = 'Pick at least 2 playlists.';
      step = 1;
      return;
    }

    const pctSum = sumPercent();
    if (pctSum > 100) {
      status = 'Percentages must not exceed 100%.';
      return;
    }

    status = 'Loading tracks from selected playlists…';
    createdUrl = '';
    previewTracks = [];
    previewTotalMs = 0;

    const tracksByPlaylist = new Map<string, Track[]>();
    for (const p of sel) {
      status = `Loading tracks: ${p.name}…`;
      const tracks = await getAllPlaylistTracks(token, p.id);
      tracksByPlaylist.set(p.id, tracks);
    }

    const capMs = Math.max(1, durationLimitMinutes) * 60_000;
    const { picked, totalMs } = buildPreview({
      tracksByPlaylist,
      playlistOrder: sel.map((p) => p.id),
      percentByPlaylist,
      capMs
    });

    if (picked.length === 0) {
      status = `Couldn’t pick any tracks under ${durationLimitMinutes} min.`;
      return;
    }

    previewTracks = shuffleInPlace(picked);
    previewTotalMs = totalMs;
    status = '';
    step = 3;
  }
</script>

<div>
  <section style="margin: 18px 0; padding: 12px; border: 1px solid #eee; border-radius: 12px;">
    <div style="margin-top: 8px; display:flex; flex-wrap:wrap; gap: 14px; align-items:center;">
      <label>
        New playlist name
        <input
          bind:value={newName}
          style="display:block; width: 360px; padding: 8px; margin-top: 6px;"
        />
      </label>

      <label style="display:flex; gap:8px; align-items:center;">
        <input type="checkbox" bind:checked={isPublic} />
        Make playlist public
      </label>
    </div>
  </section>

  {#if status}
    <p style="margin: 12px 0; color: #b00020;">{status}</p>
  {/if}

  <section style="margin: 24px 0;">
    {#if step === 1}
      <Step1 {playlists} {selected} onToggle={togglePlaylist} />

      <div style="margin-top: 18px; display:flex; gap: 12px; align-items:center;">
        <button onclick={goToStep2} disabled={selected.size < 2}>Next: Percentages</button>
        <span>Selected: {selected.size}</span>
      </div>
    {/if}

    {#if step === 2}
      <Step2
        bind:durationLimitMinutes
        bind:percentByPlaylist
        selectedPlaylists={selectedPlaylists()}
        sumPercent={sumPercent()}
        onDistributeEvenly={distributeEvenly}
        onClampPercent={clampPercent}
      />

      <div style="margin-top: 18px; display:flex; gap: 12px; align-items:center;">
        <button onclick={() => goBackToStep(1)}>Back</button>
        <button onclick={goToStep3GeneratePreview} disabled={sumPercent() > 100}>
          Next: Preview songs
        </button>
      </div>
    {/if}

    {#if step === 3}
      <div style="margin: 12px 0; display:flex; gap: 12px; align-items:center;">
        <button onclick={goToStep3GeneratePreview}>Rebuild preview</button>
        <button onclick={() => shuffleInPlace(previewTracks)}>Shuffle songs</button>
      </div>

      <Step3
        {me}
        {token}
        bind:status
        bind:createdUrl
        {isPublic}
        {newName}
        {playlists}
        {durationLimitMinutes}
        {previewTotalMs}
        {previewTracks}
      />

      <div style="margin-top: 18px; display:flex; gap: 12px; align-items:center;">
        <button onclick={() => goBackToStep(2)}>Back</button>
      </div>
    {/if}
  </section>
</div>
