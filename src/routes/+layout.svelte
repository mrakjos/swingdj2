<script lang="ts">
	// import './layout.css';

	const { children } = $props();
</script>

<header>
  <h1>Welcome to Swing DJ 2</h1>
</header>

{@render children()}

<footer>
  <p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
</footer>
