/**
 * Robinhood Chain Meme Hunter — Cron Relay V3 Diagnostic
 *
 * Diagnostic-only relay update:
 * - Preserves the Service Binding architecture.
 * - Adds /test-binding to expose the real MEME_HUNTER binding/fetch error.
 * - Scheduled cron catches and logs the exact error message instead of surfacing
 *   only the cron expression.
 * - Does not change the main V670 scanner, scoring, providers, thresholds,
 *   Telegram logic, or 42-request ceiling.
 */

const MAIN_SCAN_URL =
  "https://robinhood-meme-hunter.johnd1987.workers.dev/scan?v670ScheduledRelay=1";

function errorText(err) {
  if (!err) return "UNKNOWN_ERROR";
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try {
    return typeof err === "string" ? err : JSON.stringify(err);
  } catch (_) {
    return String(err);
  }
}

async function callMainScan(env) {
  const bindingPresent = !!env.MEME_HUNTER;
  const bindingFetchType = typeof env.MEME_HUNTER?.fetch;

  if (!bindingPresent || bindingFetchType !== "function") {
    return {
      ok: false,
      stage: "BINDING_CHECK",
      error: "MEME_HUNTER_SERVICE_BINDING_MISSING_OR_INVALID",
      bindingPresent,
      bindingFetchType
    };
  }

  try {
    const request = new Request(MAIN_SCAN_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "x-robinhood-meme-hunter-cron-relay": "SERVICE_BINDING_V3_DIAGNOSTIC"
      }
    });

    const response = await env.MEME_HUNTER.fetch(request);
    const body = await response.text();

    return {
      ok: response.ok,
      stage: "SERVICE_BINDING_FETCH",
      httpStatus: response.status,
      responsePreview: body.slice(0, 800),
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      ok: false,
      stage: "SERVICE_BINDING_FETCH_EXCEPTION",
      error: errorText(err),
      bindingPresent,
      bindingFetchType,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/test-binding") {
      const result = await callMainScan(env);
      return Response.json(result, { status: result.ok ? 200 : 500 });
    }

    return Response.json({
      ok: true,
      worker: "Robinhood Chain Meme Hunter Cron Relay",
      version: "V3_DIAGNOSTIC",
      status: "ONLINE",
      binding: "MEME_HUNTER",
      targetWorker: "robinhood-meme-hunter",
      diagnosticRoute: "/test-binding",
      timestamp: new Date().toISOString()
    });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      const result = await callMainScan(env);

      if (!result.ok) {
        console.error("RELAY_V3_DIAGNOSTIC_FAILURE", result);
        return;
      }

      console.log("RELAY_V3_DIAGNOSTIC_SUCCESS", result);
    })());
  }
};
