export async function register() {
  // Keep-alive: ping self every 10 minutes to prevent Render free tier spin-down
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    const url = `${process.env.RENDER_EXTERNAL_URL}/api/health`;
    const INTERVAL = 10 * 60 * 1000; // 10 minutes

    setInterval(async () => {
      try {
        await fetch(url);
      } catch {
        // ignore errors
      }
    }, INTERVAL);

    console.log(`[keep-alive] Pinging ${url} every 10 minutes`);
  }
}
