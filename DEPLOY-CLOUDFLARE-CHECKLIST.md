# Cloudflare Launch Checklist (Worker + Static Assets)

## 1) Prepare repo

- Keep your entry file as `index.html` (already set in this repo).
- Replace placeholder booking URL (`https://calendly.com`) with your real link.

## 2) Deploy with Wrangler (Worker + static assets)

1. From `my-landing-page`, deploy the Worker:

- `npx wrangler deploy`

2. Ensure your `wrangler.jsonc` includes:

- `"main": "worker.js"`
- `"assets": { "directory": "./static" }`
- `"workers_dev": false`
- `"preview_urls": false`

3. Add required secrets:

- `npx wrangler secret put KIT_API_KEY`
- `npx wrangler secret put KIT_FORM_ID`

4. Deploy again after setting secrets.

## 3) Connect custom domain

1. In your Worker: **Domains & Routes** → **Add custom domain**.
2. Add both domains:
   - `fulcror.com` (apex, canonical)
   - `www.fulcror.com`
3. Cloudflare will create/guide required DNS records.
4. Enable HTTPS (usually automatic with Universal SSL).

## 3.1) Force canonical domain (301)

- Use Cloudflare Dashboard (host-level redirect):
  1. Go to **Rules** → **Redirect Rules** → **Create rule**.
  2. If incoming requests match:
     - **Hostname** equals `www.fulcror.com`
  3. Then dynamic redirect to:
     - `https://fulcror.com/${1}` (or preserve path/query with the UI variables)
  4. Status code: **301 (Permanent Redirect)**.
- Result: any `www` URL permanently redirects to apex.

## 4) Core Web Vitals quick checks before going live

- Run Lighthouse (mobile + desktop) on the deployed URL.
- Targets:
  - LCP: under 2.5s
  - CLS: under 0.1
  - INP: under 200ms
- Confirm no layout shift during first load and while quiz steps change.
- Verify form interactions feel instant on mobile.

## 5) Post-launch checks

- Confirm all CTA links work.
- Test quiz flow from Q1 to results on mobile + desktop.
- Test email input validation path.
- Validate title/description in social preview + search snippet.

## Optional hardening (later, not required now)

- Add Cloudflare Web Analytics (free).
- Configure Kit email delivery endpoint in Worker runtime:
  - API route handler is in `worker.js` (`POST /api/send-results`)
  - `functions/api/send-results.js` is only used for Pages Functions deployments.
  - Set Worker secrets:
    - `KIT_API_KEY` = your Kit API key
    - `KIT_FORM_ID` = numeric Kit form ID to subscribe contacts into
    - `RESEND_API_KEY` = your Resend API key
    - `RESEND_FROM_EMAIL` = verified sender address in Resend
    - `RESULTS_TO_EMAIL` = optional (defaults to `alessandro@fulcror.com`)
  - Redeploy after saving secrets.
  - Test by completing the diagnostic and using "Send the results to my email first".
- Add a custom `404.html` page.
