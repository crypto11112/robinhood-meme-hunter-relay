/**
 * Robinhood Chain Meme Hunter — Cron Relay V2
 *
 * Uses a Cloudflare Service Binding instead of a public Worker-to-Worker fetch.
 * Cron: every 5 minutes.
 */

const MAIN_SCAN_URL =
  "https://robinhood-meme-hunter.johnd1987.workers.dev/scan?v670ScheduledRelay=1";

async function triggerMainScan(env) {
  if (!env.MEME_HUNTER || typeof env.MEME_HUNTER.fetch !== "function") {
    throw new Error("MEME_HUNTER_SERVICE_BINDING_MISSING");
  }

  const request = new Request(MAIN_SCAN_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "x-robinhood-meme-hunter-cron-relay": "SERVICE_BINDING_V2"
    }
  });

  const response = await env.MEME_HUNTER.fetch(request);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `MAIN_SCAN_HTTP_${response.status}: ${body.slice(0, 300)}`
    );
  }

  return {
    ok: true,
    status: "MAIN_SCAN_TRIGGERED_VIA_SERVICE_BINDING",
    httpStatus: response.status,
    responsePreview: body.slice(0, 500),
    timestamp: new Date().toISOString()
  };
}

export default {
  async fetch() {
    return Response.json({
      ok: true,
      worker: "Robinhood Chain Meme Hunter Cron Relay",
      version: "V2_SERVICE_BINDING",
      status: "ONLINE",
      binding: "MEME_HUNTER",
      targetWorker: "robinhood-meme-hunter",
      timestamp: new Date().toISOString()
    });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(triggerMainScan(env));
  }
};
