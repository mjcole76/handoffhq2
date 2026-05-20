# HandOffHQ MVP Setup

HandOffHQ gives every client one polished portal for files, updates, approvals, and invoices.

## Stack

- Next.js App Router
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Vercel-ready

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Add these env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase setup

1. Create a Supabase project.
2. Open SQL editor.
3. Run `supabase/schema.sql`.
4. Confirm Storage bucket `handoff-files` exists and is public.
5. In Auth settings, enable email/password.
6. Add your deployed Vercel URL to Auth redirect URLs after deployment.

## MVP behavior

Provider can:

- sign up / log in
- save business name, logo, and brand color
- view dashboard stats
- create a client portal with a unique slug
- upload deliverables
- add milestones
- add approval requests
- add invoices with external payment links
- add project updates

Client can:

- open `/portal/[slug]`
- see provider branding
- view project timeline/status
- download deliverables
- upload assets
- approve work or request changes
- view invoices and click payment links
- read project updates

## MVP constraints

- No full chat yet — project updates only.
- No full Stripe invoicing yet — manual invoice entries with payment links.
- No complex permissions yet — one provider, one client, one portal.
- No admin dashboard yet.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add Supabase env vars.
4. Deploy.
5. Add the production URL to Supabase Auth redirect URLs.

## Product promise

One branded portal for every client handoff.
