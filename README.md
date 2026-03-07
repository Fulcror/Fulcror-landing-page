# Fulcror-landing-page

Static landing page entry point: `index.html`.

Deployment guide: `DEPLOY-CLOUDFLARE-CHECKLIST.md`.

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
- Backend endpoint is implemented as Cloudflare Pages Function:
  - `functions/api/send-results.js`
- Configure required environment variables in Cloudflare Pages:
  - `KIT_API_KEY`
  - `KIT_FORM_ID`
