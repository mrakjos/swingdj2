<script lang="ts">
	import { onMount } from 'svelte';
	import {
		addTracksToPlaylist,
		createPlaylist,
		getAllMyPlaylists,
		getAllPlaylistTracks,
		getMe
	} from '$lib/spotify/api';
	import { goto } from '$app/navigation';

	let token: string | null = null;

	let me: { id: string; display_name: string } | null = null;
	let playlists: Array<{ id: string; name: string; tracks: { total: number } }> = [];
	let selected = new Set<string>();

	let newName = 'Merged playlist';
	let dedupe = true;
	let isPublic = false;

	let status = '';
	let createdUrl: string | null = null;

	let durationLimitMinutes = 60; // [m]

	function shuffleInPlace<T>(arr: T[]) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	function pickRandomByDurationCap(
		items: Array<{ uri: string; duration_ms: number }>,
		capMs: number
	) {
		// dedupe by uri
		const map = new Map<string, number>();
		for (const it of items) {
			if (!map.has(it.uri)) map.set(it.uri, it.duration_ms);
		}

		const unique = Array.from(map, ([uri, duration_ms]) => ({ uri, duration_ms }));
		shuffleInPlace(unique);

		const picked: string[] = [];
		let total = 0;

		for (const t of unique) {
			if (total + t.duration_ms > capMs) continue;
			picked.push(t.uri);
			total += t.duration_ms;
			if (total >= capMs) break;
		}

		return { picked, totalMs: total, uniqueCount: unique.length };
	}

	function toggle(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	function logout() {
		sessionStorage.removeItem('spotify_access_token');
		sessionStorage.removeItem('spotify_expires_at');
		sessionStorage.removeItem('spotify_refresh_token');
		goto('/');
	}

	onMount(async () => {
		token = sessionStorage.getItem('spotify_access_token');
		if (!token) return goto('/');

		me = await getMe(token);
		playlists = await getAllMyPlaylists(token);
	});

	async function merge() {
		if (!token || !me) return;
		if (selected.size < 2) {
			status = 'Pick at least 2 playlists.';
			return;
		}

		status = 'Loading tracks…';
		createdUrl = null;

		const ids = Array.from(selected);
		const all: Array<{ uri: string; duration_ms: number }> = [];

		for (const id of ids) {
			status = `Loading tracks from ${id}…`;
			const tracks = await getAllPlaylistTracks(token, id);
			all.push(...tracks);
		}

		const capMs = Math.max(1, durationLimitMinutes) * 60000;
		const { picked, totalMs, uniqueCount } = pickRandomByDurationCap(all, capMs);

		if (picked.length === 0) {
			status = `Couldn’t pick any tracks under the ${durationLimitMinutes} min cap (unique tracks: ${uniqueCount}).`;
			return;
		}

		status = 'Creating playlist…';
		const created = await createPlaylist(
			token,
			me.id,
			newName.trim() || 'Random merged playlist',
			`Random selection from ${ids.length} playlists, cap ${durationLimitMinutes} min`,
			false // private by default ✅
		);

		status = `Adding ${picked.length} tracks (~${Math.round(totalMs / 60000)} min)…`;
		await addTracksToPlaylist(token, created.id, picked);

		status = 'Done!';
		createdUrl = created.external_urls.spotify;
	}
</script>

<main style="max-width: 1000px; margin: 40px auto; font-family: system-ui;">
	<header style="display:flex; justify-content:space-between; align-items:center; gap: 12px;">
		<div>
			<h1>Merge playlists</h1>
			{#if me}<p>Logged in as <b>{me.display_name}</b></p>{/if}
		</div>
		<button on:click={logout}>Logout</button>
	</header>

	<section style="margin: 24px 0; display:grid; gap: 12px;">
		<label>
			New playlist name
			<input
				bind:value={newName}
				style="display:block; width: 100%; padding: 8px; margin-top: 6px;"
			/>
		</label>

		<label>
			Duration limit (minutes)
			<input
				type="number"
				min="1"
				bind:value={durationLimitMinutes}
				style="display:block; width: 180px; padding: 8px; margin-top: 6px;"
			/>
		</label>

		<label style="display:flex; gap:8px; align-items:center;">
			<input type="checkbox" bind:checked={dedupe} />
			Remove duplicate tracks
		</label>

		<label style="display:flex; gap:8px; align-items:center;">
			<input type="checkbox" bind:checked={isPublic} />
			Make playlist public
		</label>
	</section>

	<section style="margin: 24px 0;">
		<h2>Your playlists</h2>
		<p>Select at least 2.</p>

		<div
			style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 10px;"
		>
			{#each playlists as p}
				<button
					type="button"
					on:click={() => toggle(p.id)}
					style="
            text-align:left; padding: 12px; border-radius: 10px;
            border: 1px solid #ddd; background: {selected.has(p.id) ? '#f0f7ff' : 'white'};
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
	</section>

	<section style="margin: 24px 0; display:flex; gap: 12px; align-items:center;">
		<button on:click={merge} disabled={selected.size < 2}>Create merged playlist</button>
		<span>{status}</span>
	</section>

	{#if createdUrl}
		<p>
			Created: <a href={createdUrl} target="_blank" rel="noreferrer">{createdUrl}</a>
		</p>
	{/if}
</main>
