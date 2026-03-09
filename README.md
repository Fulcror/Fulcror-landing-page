# Fulcror-landing-page

Static publish directory: `static/`.

- Primary page: `static/index.html`
- Additional routes: `static/solutions.html`, `static/services/index.html`
- Worker/API entry: `worker.js`

Deployment guide: `DEPLOY-CLOUDFLARE-CHECKLIST.md`.

## Local Development

- Worker + static assets + API routes:
  - `npx wrangler dev --local --port 8787`
  - Open `http://127.0.0.1:8787`
- Static pages only (no Worker API):
  - `cd static`
  - `py -m http.server 8080`
  - Open `http://127.0.0.1:8080`

## Diagnostic Logic

- The 8-question diagnostic now uses weighted scoring across 4 friction buckets:
  - lead
  - tech
  - ops
  - data
- Scoring is computed client-side in `index.html` (`scoreAnswers` + `deriveFriction`).
- Highest scoring bucket determines the displayed friction summary.

## Email Delivery (Kit)

- Frontend calls `POST /api/send-results` when user submits email in results card.
- Backend endpoint is implemented in Worker runtime:
  - `worker.js` (route handler for `/api/send-results`)
  - `functions/api/send-results.js` remains for Pages compatibility if you switch later.
- Configure required environment variables in Cloudflare Worker settings (or via Wrangler secrets):
  - `KIT_API_KEY`
  - `KIT_FORM_ID`

## Deployment Safety Notes

- `wrangler.jsonc` publishes only `./static` assets (prevents accidental upload of repo internals).
- `workers_dev` and `preview_urls` are explicitly disabled to keep traffic on custom domains only.
- When updating page content, edit files under `static/`.
