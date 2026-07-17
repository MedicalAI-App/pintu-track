export async function register() {
  // Hanya di server Node.js (bukan edge/build) — kontainer VPS berjalan 24/7
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
