# UrbanPulse

The storefront for UrbanPulse, a Ghanaian streetwear brand that sells heavyweight cloth cut in Accra. It's live at **[urbanpulsee.vercel.app](https://urbanpulsee.vercel.app)**.

The API lives in [UrbanPulse-backend](https://github.com/blacksensei-hub/UrbanPulse-backend). The [case study](https://jeffrey-ankrah.pages.dev/projects/urbanpulse/) explains the decisions behind both.

## What it does

- **Selling the cloth:**
  - a homepage film that plays as you scroll, from Accra at dusk down to the weave
  - a press-and-hold demo of the fabric's weight
  - editorial pages for featured products
  - size guides with each garment's own measurements
- **Paying in cedis:** mobile money and card through Paystack, or cash on delivery, with delivery priced by region and GhanaPost GPS addresses.
- **Not losing the sale:**
  - restock alerts for sold-out sizes
  - a drop list by email or SMS
  - order tracking without an account
  - WhatsApp chats that open with the product or order filled in
- **Accounts:**
  - order history, returns, saved addresses and a wishlist
  - PDF receipts and two-factor sign-in
  - loyalty tiers and referral credit
- **The admin:** a Today view, then orders, products, customers, coupons, returns, the drop list, content pages, email templates, analytics, logs and settings.
- **Feeling like an app:** spring animations, frosted navigation that turns solid for anyone asking for less transparency or more contrast, and an installable PWA.

## Stack

React and Vite, Tailwind CSS, React Router, TanStack Query, Zustand, Framer Motion, Recharts, `vite-plugin-pwa`, and Sentry. Inter, JetBrains Mono and Clash Display are self-hosted.

## Running it locally

You need Node.js 18 or later, and the API running locally (see the backend README).

```bash
npm install
npm run dev        # http://localhost:5173
```

`.env.development` already points the app at `http://localhost:5000/api`. Optional settings:

| Variable | What it's for |
|---|---|
| `VITE_API_URL` | The API's address. Production uses `/api`, which `vercel.json` forwards to the backend, so the sign-in cookie stays first-party |
| `VITE_APP_URL` | The site's public address for canonical and share links. When unset, it's wherever the site is served |
| `VITE_GOOGLE_CLIENT_ID` | Google sign-in |
| `VITE_SENTRY_DSN` | Error reporting |

## Building

```bash
npm run build      # to dist/
npm run preview
```

The build first fetches Clash Display from Fontshare into `public/fonts/clash/`. Its licence allows self-hosting but not publishing the files in a public repository, so they're downloaded at build time and ignored by git. If Fontshare can't be reached, the site loads the same files from Fontshare directly.

Two scripts rebuild assets by hand:
- `scripts/build-fonts.py` refreshes the self-hosted Inter and JetBrains Mono, including the small file that holds only the cedi sign.
- `scripts/build-media.ps1` makes the WebP versions of the photos in `public/media/`. It needs ffmpeg.

## Checks

```bash
npm run lint       # ESLint: recommended rules, React's rules of hooks (eslint.config.js)
```

GitHub Actions runs lint and the production build on every pull request (`.github/workflows/ci.yml`).
