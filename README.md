# HandOffHQ MVP Setup

HandOffHQ gives freelancers and small agencies one branded client portal for files, updates, approvals, uploads, and manual invoice payment links.

This is intentionally a focused MVP. It is not trying to be a full client operations suite yet.

## Stack

- Next.js App Router
- Tailwind CSS
- Supabase Auth
- Supabase Postgres with RLS
- Supabase Storage
- Vercel-ready deployment

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Required env vars:

```bash
# Supabase project URL used by the browser client.
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase anon/public key. Safe for frontend use when RLS policies are configured.
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Canonical app URL used for generated portal links and deployed previews.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

No service-role key is required by the app. Do not add service-role secrets to frontend env vars.

## Supabase setup

1. Create a Supabase project.
2. Open SQL editor.
3. Run `supabase/schema.sql`.
4. Confirm Storage bucket `handoff-files` exists.
5. In Auth settings, enable email/password.
6. Add your deployed Vercel URL to Auth redirect URLs after deployment.

## MVP behavior

Provider can:

- sign up / log in
- save business name, logo, and brand color
- view dashboard stats
- create a client portal with a unique slug and access code
- copy the portal link and access code
- upload deliverables
- add milestones
- add approval requests
- add invoices with external payment links
- add project updates

Client can:

- open `/portal/[slug]`
- enter the access code sent by the provider
- unlock the portal in that browser session
- see provider branding
- view project timeline/status
- download deliverables
- upload assets
- approve work or request changes
- view invoices and click payment links
- read project updates

## Portal access protection

Client portals are protected by an `access_code` on the `clients` table.

- Providers see/copy both the portal URL and access code in the dashboard.
- Clients must enter the access code before portal data is shown.
- Successful access is stored in `sessionStorage` for that browser.
- Direct public table reads are removed from the schema.
- Public portal reads/actions go through access-code RPC functions:
  - `verify_portal_access`
  - `submit_approval_response`
  - `record_client_upload`

Important MVP limitation: storage objects are still served through a public Supabase bucket once a file URL is known. The portal listing itself is protected, but this is not the same as signed-file storage.

## Demo workflow

Fast manual QA path:

1. Sign up as a provider.
2. Save business name, brand color, and optional logo.
3. Create one client portal.
4. Copy the portal link and access code.
5. Add one milestone, one approval request, one update, one manual invoice link, and one deliverable.
6. Open the portal link in an incognito/private browser.
7. Enter the access code.
8. Approve the request or request changes.
9. Upload one client file.
10. Confirm the whole flow takes under 5 minutes.

Optional seed data:

- Open `supabase/demo-seed.sql`.
- Replace `PROVIDER_AUTH_USER_ID` with a real Supabase Auth user id.
- Run it in Supabase SQL editor.
- Visit `/portal/demo-acme-launch`.
- Use access code `DEMO-123`.

## Screenshots

Add fresh screenshots after each major UI polish pass:

- Marketing page: `docs/screenshots/marketing-home.png`
- Provider dashboard: `docs/screenshots/provider-dashboard.png`
- Protected portal gate: `docs/screenshots/portal-access-gate.png`
- Client portal unlocked: `docs/screenshots/client-portal.png`

Current screenshot checklist:

- [ ] Mobile homepage
- [ ] Mobile dashboard stats/client detail flow
- [ ] Desktop dashboard SaaS layout
- [ ] Access-code gate
- [ ] Unlocked client portal

## Production checklist

Before sending to real freelancers/agencies:

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run latest `supabase/schema.sql` in Supabase.
- [ ] Confirm `.env.local` and real keys are not committed.
- [ ] Confirm Vercel has only public Supabase env vars.
- [ ] Add production URL to Supabase Auth Site URL and redirect URLs.
- [ ] Create a test provider account.
- [ ] Create one real test client portal.
- [ ] Verify access code gate in incognito/private browser.
- [ ] Test approval response.
- [ ] Test client upload.
- [ ] Test manual invoice payment link.
- [ ] Test on mobile.

## Known limitations

These are intentional for the current MVP:

- No full Stripe invoicing or webhook reconciliation — invoices use manual external payment links.
- No subscriptions or billing system.
- No team permissions or multi-seat provider accounts.
- No full chat — project updates are intentionally used instead.
- No admin dashboard.
- No signed/private storage URLs yet; file listings are protected by access code, but public bucket files can be opened if someone has the exact file URL.
- No password reset customization beyond Supabase defaults.
- No audit log, notification emails, or client identity verification.
- Access codes are simple shared secrets; rotate manually by editing the client row if exposed.

## MVP constraints

Do not add these until first-user feedback proves demand:

- full chat
- full Stripe invoicing/subscriptions
- complex permissions
- admin dashboard
- agency team management
- heavy analytics
- AI review/scanner workflows

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add Supabase env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy.
5. Add the production URL to Supabase Auth redirect URLs.
6. Run the production checklist above.

## Product promise

One branded, protected portal for every client handoff.
