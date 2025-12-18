<script lang="ts">
	import { onMount } from 'svelte';

	import { exchangeCodeForToken } from '$lib/spotify/auth';
	import { goto } from '$app/navigation';
	import { PUBLIC_SPOTIFY_CLIENT_ID, PUBLIC_SPOTIFY_REDIRECT_URI } from '$env/static/public';
  import {
    env
  } from '$lib';

	let error: string | null = null;

	onMount(async () => {
		try {
			const url = new URL(window.location.href);
			const code = url.searchParams.get('code');
			const state = url.searchParams.get('state');
			const expectedState = sessionStorage.getItem('spotify_auth_state');

			if (!code) throw new Error('Missing code.');
			if (!state || !expectedState || state !== expectedState) throw new Error('State mismatch.');

			const token = await exchangeCodeForToken({
				clientId: PUBLIC_SPOTIFY_CLIENT_ID || env.PUBLIC_SPOTIFY_CLIENT_ID,
				redirectUri: PUBLIC_SPOTIFY_REDIRECT_URI || env.PUBLIC_SPOTIFY_REDIRECT_URI,
				code
			});

			sessionStorage.setItem('spotify_access_token', token.access_token);
			sessionStorage.setItem('spotify_expires_at', String(Date.now() + token.expires_in * 1000));

			if (token.refresh_token) {
				sessionStorage.setItem('spotify_refresh_token', token.refresh_token);
			}

			await goto('/app');
		} catch (e: any) {
			error = e?.message ?? String(e);
		}
	});
</script>

<div>
	<h1>Callback</h1>
	{#if error}
		<p style="color: red;">{error}</p>
	{:else}
		<p>Logging you in…</p>
	{/if}
</div>
