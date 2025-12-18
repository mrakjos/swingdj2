<script lang="ts">
  // import './layout.css';

  const { children } = $props();
</script>

<div style="max-width: 1100px; margin: 40px auto; font-family: system-ui;">
  <header>
    <h1>Welcome to Swing DJ 2</h1>
  </header>

  <main>
    {@render children()}
  </main>

  <footer>
    <p>
      Visit project <a href="https://github.com/mrakjos/swingdj2/">https://github.com/mrakjos/swingdj2/</a>
    </p>
  </footer>
</div>
