export async function register() {
  // Keep delivering free-setup-call SMS and sheet rows that were still pending when the server stopped.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOutbox } = await import("./lib/outbox");
    startOutbox();
  }
}
