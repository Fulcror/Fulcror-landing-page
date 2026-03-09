const DEFAULT_RESULTS_TO_EMAIL = "alessandro@fulcror.com";

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const email = String(body?.email || "").trim();
    const honeypot = String(body?.website || "").trim();
    const friction = body?.friction || {};
    const answers = body?.answers || {};

    // Silent success for bot submissions so automated agents get no signal.
    if (honeypot) {
      return json({ ok: true }, 202);
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      return json({ ok: false, error: "Invalid email" }, 400);
    }

    const apiKey = context.env.KIT_API_KEY;
    const formId = context.env.KIT_FORM_ID;

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

    const kitRaw = await kitRes.text();
    let kitData = null;
    try {
      kitData = kitRaw ? JSON.parse(kitRaw) : null;
    } catch {
      kitData = null;
    }

    if (!kitRes.ok) {
      return json(
        {
          ok: false,
          error: "Kit API request failed",
          upstreamStatus: kitRes.status,
          detail: getKitDetail(kitData, kitRaw),
        },
        502,
      );
    }

    const subscription =
      kitData && typeof kitData === "object" ? kitData.subscription : null;
    if (!subscription || typeof subscription !== "object") {
      return json(
        {
          ok: false,
          error: "Kit response was unexpected",
          detail: getKitDetail(kitData, kitRaw),
        },
        502,
      );
    }

    const subscriptionState = String(
      subscription.state || subscription.status || "",
    ).toLowerCase();
    const needsConfirmation = ["inactive", "unconfirmed", "pending"].some(
      (token) => subscriptionState.includes(token),
    );

    // Non-blocking owner notification: Kit subscription remains primary flow.
    const ownerNotification = await sendOwnerNotification({
      env: context.env,
      leadEmail: email,
      friction,
      answers,
      subscriptionState,
      needsConfirmation,
    });

    return json(
      {
        ok: true,
        subscriptionId: subscription.id || null,
        subscriptionState: subscriptionState || null,
        needsConfirmation,
        ownerNotificationSent: ownerNotification.sent,
      },
      200,
    );
  } catch (error) {
    return json({ ok: false, error: "Unexpected server error" }, 500);
  }
}

async function sendOwnerNotification({
  env,
  leadEmail,
  friction,
  answers,
  subscriptionState,
  needsConfirmation,
}) {
  const resendApiKey = String(env.RESEND_API_KEY || "").trim();
  const fromEmail = String(env.RESEND_FROM_EMAIL || "").trim();
  const toEmail = String(
    env.RESULTS_TO_EMAIL || DEFAULT_RESULTS_TO_EMAIL,
  ).trim();

  if (!resendApiKey || !fromEmail || !toEmail) {
    return { sent: false, skipped: true };
  }

  const submittedAt = new Date().toISOString();
  const subject = `New Fulcror diagnostic: ${leadEmail}`;
  const answersRows = Object.entries(answers || {})
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(
      ([q, value]) =>
        `<tr><td style="padding:6px 10px;border:1px solid #ddd;">Q${escapeHtml(String(q))}</td><td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(String(value))}</td></tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
      <h2 style="margin:0 0 12px;">New Growth Diagnostic Submission</h2>
      <p><strong>Submitted at (UTC):</strong> ${escapeHtml(submittedAt)}</p>
      <p><strong>Lead email:</strong> ${escapeHtml(leadEmail)}</p>
      <p><strong>Top friction:</strong> ${escapeHtml(String(friction?.title || "N/A"))}</p>
      <p><strong>Friction summary:</strong> ${escapeHtml(String(friction?.desc || "N/A"))}</p>
      <p><strong>Kit status:</strong> ${escapeHtml(subscriptionState || "unknown")} (${needsConfirmation ? "needs confirmation" : "active/confirmed"})</p>
      <h3 style="margin:18px 0 8px;">Answers</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd;">${answersRows || '<tr><td style="padding:6px 10px;border:1px solid #ddd;">No answers captured.</td></tr>'}</table>
    </div>
  `;

  const text = [
    "New Growth Diagnostic Submission",
    `Submitted at (UTC): ${submittedAt}`,
    `Lead email: ${leadEmail}`,
    `Top friction: ${String(friction?.title || "N/A")}`,
    `Friction summary: ${String(friction?.desc || "N/A")}`,
    `Kit status: ${subscriptionState || "unknown"} (${needsConfirmation ? "needs confirmation" : "active/confirmed"})`,
    "Answers:",
    ...Object.entries(answers || {})
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([q, value]) => `- Q${q}: ${String(value)}`),
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: leadEmail,
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      return { sent: false, skipped: false };
    }

    return { sent: true, skipped: false };
  } catch {
    return { sent: false, skipped: false };
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getKitDetail(kitData, kitRaw) {
  if (kitData && typeof kitData === "object") {
    if (typeof kitData.error === "string" && kitData.error)
      return kitData.error;
    if (typeof kitData.message === "string" && kitData.message)
      return kitData.message;
  }

  const normalized = String(kitRaw || "").trim();
  return normalized.slice(0, 300) || "No upstream detail";
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
