<script lang="ts">
  import { startLogin } from '$lib/spotify/auth';

  import { PUBLIC_SPOTIFY_CLIENT_ID, PUBLIC_SPOTIFY_REDIRECT_URI } from '$env/static/public';
  import { env } from '$lib';

  function login() {
    startLogin(
      PUBLIC_SPOTIFY_CLIENT_ID || env.PUBLIC_SPOTIFY_CLIENT_ID,
      PUBLIC_SPOTIFY_REDIRECT_URI || env.PUBLIC_SPOTIFY_REDIRECT_URI
    );
  }
</script>

<div>
  <p>Login, pick 2+ playlists, and create a new merged playlist on your account.</p>
  <button on:click={login}>Login with Spotify</button>
</div>
