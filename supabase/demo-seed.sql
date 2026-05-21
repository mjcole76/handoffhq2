-- Optional HandOffHQ demo data instructions
-- Use this after signing up one provider account in the app.
-- Replace PROVIDER_AUTH_USER_ID with the auth.users id from Supabase Auth > Users.
-- This creates one branded profile, one protected client portal, and demo portal records.

begin;

insert into public.users (id, email, business_name, brand_color, logo_url)
values (
  'PROVIDER_AUTH_USER_ID',
  'demo-provider@example.com',
  'Northstar Studio',
  '#22d3ee',
  null
)
on conflict (id) do update set
  business_name = excluded.business_name,
  brand_color = excluded.brand_color,
  logo_url = excluded.logo_url;

with demo_client as (
  insert into public.clients (provider_id, name, email, company, project_name, project_status, slug, access_code)
  values (
    'PROVIDER_AUTH_USER_ID',
    'Jordan Lee',
    'client@example.com',
    'Acme Co.',
    'Acme Launch Handoff',
    'Review',
    'demo-acme-launch',
    'DEMO-123'
  )
  on conflict (slug) do update set
    project_status = excluded.project_status,
    access_code = excluded.access_code
  returning id, provider_id
)
insert into public.milestones (provider_id, client_id, title, description, status, due_date)
select provider_id, id, 'Final files uploaded', 'Brand assets and launch page files are ready for review.', 'complete', current_date
from demo_client;

insert into public.approvals (provider_id, client_id, title, description, status)
select provider_id, id, 'Approve homepage hero section', 'Confirm the headline, CTA, and first-screen layout before launch.', 'pending'
from public.clients
where slug = 'demo-acme-launch';

insert into public.invoices (provider_id, client_id, title, amount, payment_url, status)
select provider_id, id, 'Final project balance', 750.00, 'https://stripe.com/payments/payment-links', 'unpaid'
from public.clients
where slug = 'demo-acme-launch';

insert into public.updates (provider_id, client_id, title, body)
select provider_id, id, 'Ready for client review', 'The portal is ready for a quick approval pass. Use the approval card to approve or request changes.'
from public.clients
where slug = 'demo-acme-launch';

commit;

-- Demo portal URL: /portal/demo-acme-launch
-- Demo access code: DEMO-123
