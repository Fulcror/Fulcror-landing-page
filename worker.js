const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/send-results") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }

      return handleSendResults(request, env);
    }

    // Serve static site files for all non-API routes.
    return env.ASSETS.fetch(request);
  },
};

async function handleSendResults(request, env) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim();
    const honeypot = String(body?.website || "").trim();
    const friction = body?.friction || {};
    const answers = body?.answers || {};

    // Silent success for bot submissions so automated agents get no signal.
    if (honeypot) {
      return json({ ok: true }, 202);
    }

    if (!EMAIL_RE.test(email)) {
      return json({ ok: false, error: "Invalid email" }, 400);
    }

    const apiKey = env.KIT_API_KEY;
    const formId = env.KIT_FORM_ID;

    if (!apiKey || !formId) {
      return json(
        { ok: false, error: "Server is not configured for email delivery." },
        500,
      );
    }

    const answersSummary = Object.entries(answers)
      .map(([question, value]) => `Q${question}:${String(value)}`)
      .join(", ")
      .slice(0, 900);

    const kitPayload = {
      api_key: apiKey,
      email,
      fields: {
        friction_title: String(friction.title || "").slice(0, 200),
        friction_desc: String(friction.desc || "").slice(0, 700),
        answers_summary: answersSummary,
        source: "fulcror-growth-diagnostic",
      },
      tags: ["growth-diagnostic"],
    };

    const kitRes = await fetch(
      `https://api.convertkit.com/v3/forms/${formId}/subscribe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kitPayload),
      },
    );

    if (!kitRes.ok) {
      const detail = await kitRes.text();
      return json({ ok: false, error: "Kit API request failed", detail }, 502);
    }

    return json({ ok: true }, 200);
  } catch {
    return json({ ok: false, error: "Unexpected server error" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
