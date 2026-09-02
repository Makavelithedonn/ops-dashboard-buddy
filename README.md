# tmni dashboard 

Build an admin operations dashboard for a vehicle-insurance funnel using TanStack Start. Do NOT enable Lovable Cloud — I am connecting my own Supabase.

I uploaded dashboard-source.zip containing the complete source (routes, API, components, styles, and supabase-schema.sql). Use those files as-is for the app code.

ENVIRONMENT VARIABLES (already set in this project):
- VITE_SUPABASE_URL=https://gjvkrtyhsifimthqfibr.supabase.co
- VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_A6E6S6FgFC_Q9lgkiovXow_B6XXgsUL
- SUPABASE_URL=https://gjvkrtyhsifimthqfibr.supabase.co
- SUPABASE_PUBLISHABLE_KEY=sb_publishable_A6E6S6FgFC_Q9lgkiovXow_B6XXgsUL
- SUPABASE_SERVICE_ROLE_KEY=<I will add this in Settings → Secrets>

DATABASE: The schema is in supabase-schema.sql inside the zip. Run it in my Supabase SQL Editor (I'll do that). It creates tracked_sessions, user_roles, app_role enum, has_role(), bootstrap admin trigger for jacobyousef771@gmail.com, RLS policies, and review functions. Do not create migrations that duplicate it — only create migrations for anything missing after I confirm the schema is applied.

CORS: In the api/public/*.ts files, set the ALLOWED_ORIGIN to my public site: https://tmnbcre.lovable.app

REQUIREMENTS (already implemented in the uploaded files, just wire them up):
1. /auth — admin email+password sign-in (Supabase Auth). Only jacobyousef771@gmail.com gets admin role via the bootstrap trigger.
2. /admin — protected LTR operations dashboard. Polls tracked_sessions every 3s. Sidebar with live page-traffic counters, overview cards, sessions table (session id, national id, phone, IP, country, current page, updated at 12h UTC+3). Click any row/card to open session detail modal with Accept/Reject buttons.
3. API routes: POST /api/public/track (page views + form data + IP/country), GET /api/public/gate (auto-releases early steps, holds at card step), POST /api/public/control (Accept/Reject/Redirect).
4. Sound alerts always on (distinct tones for new session, plan selected, card step reached, submission). No mock data — real DB only.
5. Register the Supabase bearer attacher in src/start.ts so requireSupabaseAuth works.

After the build is green, tell me the project's published URL so I can point my public site's tracking script at it.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ops-dashboard-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/93dc1153-e187-4aba-a2e4-7efd8cafa650).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Admin: Card management (Worker API)

This project can proxy admin requests to a Cloudflare Worker (JB-end). Configure the following environment variables in your deployment or .env:

- WORKER_API_BASE: Base URL of the Worker API (e.g. https://jb-end.example.workers.dev). For JB-end deployment example use: https://cards-api-worker.devopsjacob.workers.dev
- WORKER_API_TOKEN: Service token for the Worker API (sent from server-side proxy only)

Server-side proxy route: /api/admin/cards — it requires an admin Supabase session (the browser must include the Supabase auth token when calling the route). The proxy forwards to the Worker endpoints:

- GET /api/admin/cards?q=...&page=...&limit=...  -> GET {WORKER_API_BASE}/cards/search
- GET /api/admin/cards?id=... -> GET {WORKER_API_BASE}/cards/:id
- PUT /api/admin/cards?id=... -> PUT {WORKER_API_BASE}/cards/:id
- DELETE /api/admin/cards?id=... -> DELETE {WORKER_API_BASE}/cards/:id

Phone numbers are masked in the list view and shown in full on the card detail page for authorized admins.

### Tests

A small unit test is included at `tests/mask-phone.test.ts`. To run the test suite locally install a test runner (e.g. vitest) and run `npx vitest` or run the file directly with node (ensure module resolution for @ paths):

```sh
# using vitest (recommended):
npm i -D vitest
npx vitest run

# or run test file directly (simple):
node --loader ts-node/esm tests/mask-phone.test.ts
```

