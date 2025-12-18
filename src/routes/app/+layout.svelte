<script lang="ts">
	import { goto } from '$app/navigation';

	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const { me } = data;

	function logout() {
		sessionStorage.removeItem('spotify_access_token');
		sessionStorage.removeItem('spotify_expires_at');
		sessionStorage.removeItem('spotify_refresh_token');
		goto('/');
	}
</script>

<header style="display:flex; justify-content:space-between; align-items:center; gap: 12px;">
	<div>
		<h1>Playlist builder</h1>
		{#if me}<p>Logged in as <b>{me.display_name}</b></p>{/if}
	</div>
	<button onclick={logout}>Logout</button>
</header>

{@render children()}
