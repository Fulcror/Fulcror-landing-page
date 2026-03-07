# Cloudflare Pages Launch Checklist (Static HTML)

## 1) Prepare repo

- Keep your entry file as `index.html` (already set in this repo).
- Replace placeholder booking URL (`https://calendly.com`) with your real link.

## 2) Deploy to Cloudflare Pages (free)

1. Go to Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages**.
2. Connect your GitHub repo.
3. Configure build:
   - Framework preset: **None**
   - Build command: _(leave empty)_
   - Build output directory: `/`
4. Deploy.

## 3) Connect custom domain

1. In your Pages project: **Custom domains** → **Set up a custom domain**.
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
- Configure Kit email delivery endpoint (already scaffolded in `functions/api/send-results.js`):
  - In Cloudflare Pages project settings, add environment variables:
    - `KIT_API_KEY` = your Kit API key
    - `KIT_FORM_ID` = numeric Kit form ID to subscribe contacts into
  - Redeploy after saving env vars.
  - Test by completing the diagnostic and using "Send the results to my email first".
- Add a custom `404.html` page.
