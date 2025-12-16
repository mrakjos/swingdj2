<script lang="ts">
  import { startLogin } from '$lib/spotify/auth';

  import { PUBLIC_SPOTIFY_CLIENT_ID, PUBLIC_SPOTIFY_REDIRECT_URI } from '$env/static/public';

  function login() {
    startLogin(PUBLIC_SPOTIFY_CLIENT_ID, PUBLIC_SPOTIFY_REDIRECT_URI);
  }
</script>

<main style="max-width: 800px; margin: 40px auto; font-family: system-ui;">
  <p>Login, pick 2+ playlists, and create a new merged playlist on your account.</p>
  <button on:click={login}>Login with Spotify</button>
</main>
