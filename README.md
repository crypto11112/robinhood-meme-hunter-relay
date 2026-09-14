/**
 * Robinhood Chain Meme Hunter — V670 Cron Relay Worker
 *
 * PURPOSE
 * - Tiny Cloudflare Worker whose only job is to trigger the main Meme Hunter
 *   every 5 minutes without running the heavy scanner inside a Cron Trigger.
 * - The main V670 Worker keeps all scanner/provider/scoring/Telegram logic.
 * - This relay makes one POST request to the main Worker's V670 scheduled-relay route.
 *
 * CLOUDFLARE SETUP
 * - Deploy this as a SEPARATE Worker, e.g. robinhood-meme-hunter-relay
 * - Add a Cron Trigger for every 5 minutes.
 * - Remove/disable the every-5-minutes cron from the main robinhood-meme-hunter Worker.
 *
 * COST
 * - Designed for Cloudflare Free tier.
 */

const MAIN_SCHEDULED_SCAN_URL =
  "https://robinhood-meme-hunter.johnd1987.workers.dev/scan?v670ScheduledRelay=1";

async function triggerMainScan() {
  const response = await fetch(
    MAIN_SCHEDULED_SCAN_URL,
    {
      method: "POST",
      headers: {
        "accept": "application/json",
        "x-robinhood-meme-hunter-cron-relay": "V670_EXTERNAL_RELAY"
      }
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `MAIN_SCAN_HTTP_${response.status}: ${body.slice(0, 300)}`
    );
  }

  return {
    ok: true,
    status: "MAIN_SCAN_TRIGGERED",
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
      status: "ONLINE",
      target: MAIN_SCHEDULED_SCAN_URL,
      timestamp: new Date().toISOString()
    });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(triggerMainScan());
  }
};
