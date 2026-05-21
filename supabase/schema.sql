-- HandOffHQ MVP schema
-- Run this in Supabase SQL editor, then create/use the storage bucket named: handoff-files.
-- This version protects client portals with access codes and keeps direct public table reads disabled.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  business_name text,
  logo_url text,
  brand_color text default '#22d3ee',
  created_at timestamptz default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  email text,
  company text,
  project_name text not null,
  project_status text not null default 'Active',
  slug text not null unique,
  access_code text not null default ('HQ-' || lpad((floor(random() * 1000000))::int::text, 6, '0')),
  created_at timestamptz default now()
);

alter table public.clients add column if not exists access_code text;
update public.clients set access_code = 'HQ-' || lpad((floor(random() * 1000000))::int::text, 6, '0') where access_code is null or access_code = '';
alter table public.clients alter column access_code set default ('HQ-' || lpad((floor(random() * 1000000))::int::text, 6, '0'));
alter table public.clients alter column access_code set not null;

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  file_path text not null,
  file_type text not null check (file_type in ('deliverable', 'client_upload')),
  uploaded_by text not null check (uploaded_by in ('provider', 'client')),
  created_at timestamptz default now()
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'complete')),
  due_date date,
  created_at timestamptz default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  response_note text,
  created_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  amount numeric(10,2) not null default 0,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  payment_url text not null,
  created_at timestamptz default now()
);

create table if not exists public.updates (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.files enable row level security;
alter table public.milestones enable row level security;
alter table public.approvals enable row level security;
alter table public.invoices enable row level security;
alter table public.updates enable row level security;

-- Re-create policies idempotently.
drop policy if exists "users own profile" on public.users;
drop policy if exists "public can read provider branding" on public.users;
drop policy if exists "providers manage own clients" on public.clients;
drop policy if exists "public can read client portal by slug" on public.clients;
drop policy if exists "providers manage own files" on public.files;
drop policy if exists "public can read portal files" on public.files;
drop policy if exists "public can upload client files" on public.files;
drop policy if exists "providers manage own milestones" on public.milestones;
drop policy if exists "public can read milestones" on public.milestones;
drop policy if exists "providers manage own approvals" on public.approvals;
drop policy if exists "public can read approvals" on public.approvals;
drop policy if exists "public can update approval status" on public.approvals;
drop policy if exists "providers manage own invoices" on public.invoices;
drop policy if exists "public can read invoices" on public.invoices;
drop policy if exists "providers manage own updates" on public.updates;
drop policy if exists "public can read updates" on public.updates;

create policy "users own profile" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "providers manage own clients" on public.clients
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

create policy "providers manage own files" on public.files
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

create policy "providers manage own milestones" on public.milestones
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

create policy "providers manage own approvals" on public.approvals
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

create policy "providers manage own invoices" on public.invoices
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

create policy "providers manage own updates" on public.updates
  for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);

-- Public portal access goes through security-definer RPC functions instead of direct table SELECT policies.
create or replace function public.verify_portal_access(p_slug text, p_access_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.clients%rowtype;
  provider jsonb;
begin
  select * into c
  from public.clients
  where slug = p_slug
    and access_code = p_access_code
  limit 1;

  if not found then
    return jsonb_build_object('provider', null, 'client', null, 'files', '[]'::jsonb, 'milestones', '[]'::jsonb, 'approvals', '[]'::jsonb, 'invoices', '[]'::jsonb, 'updates', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'id', u.id,
    'email', null,
    'business_name', u.business_name,
    'logo_url', u.logo_url,
    'brand_color', u.brand_color,
    'created_at', u.created_at
  ) into provider
  from public.users u
  where u.id = c.provider_id;

  return jsonb_build_object(
    'provider', provider,
    'client', jsonb_build_object(
      'id', c.id,
      'provider_id', c.provider_id,
      'name', c.name,
      'email', null,
      'company', c.company,
      'project_name', c.project_name,
      'project_status', c.project_status,
      'slug', c.slug,
      'access_code', null,
      'created_at', c.created_at
    ),
    'files', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc) from public.files f where f.client_id = c.id), '[]'::jsonb),
    'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at asc) from public.milestones m where m.client_id = c.id), '[]'::jsonb),
    'approvals', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from public.approvals a where a.client_id = c.id), '[]'::jsonb),
    'invoices', coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from public.invoices i where i.client_id = c.id), '[]'::jsonb),
    'updates', coalesce((select jsonb_agg(to_jsonb(up) order by up.created_at desc) from public.updates up where up.client_id = c.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_approval_response(
  p_slug text,
  p_access_code text,
  p_approval_id uuid,
  p_status text,
  p_response_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  client_id_match uuid;
begin
  if p_status not in ('approved', 'changes_requested') then
    raise exception 'Invalid approval status';
  end if;

  select id into client_id_match
  from public.clients
  where slug = p_slug and access_code = p_access_code
  limit 1;

  if client_id_match is null then
    raise exception 'Invalid portal access code';
  end if;

  update public.approvals
  set status = p_status,
      response_note = nullif(p_response_note, '')
  where id = p_approval_id
    and client_id = client_id_match;

  if not found then
    raise exception 'Approval request not found for this portal';
  end if;
end;
$$;

create or replace function public.record_client_upload(
  p_slug text,
  p_access_code text,
  p_title text,
  p_file_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.clients%rowtype;
  new_file_id uuid;
begin
  select * into c
  from public.clients
  where slug = p_slug and access_code = p_access_code
  limit 1;

  if not found then
    raise exception 'Invalid portal access code';
  end if;

  if position('/client-uploads/' in p_file_path) = 0 then
    raise exception 'Client uploads must be stored under the client-uploads folder';
  end if;

  insert into public.files (provider_id, client_id, title, file_path, file_type, uploaded_by)
  values (c.provider_id, c.id, p_title, p_file_path, 'client_upload', 'client')
  returning id into new_file_id;

  return new_file_id;
end;
$$;

grant execute on function public.verify_portal_access(text, text) to anon, authenticated;
grant execute on function public.submit_approval_response(text, text, uuid, text, text) to anon, authenticated;
grant execute on function public.record_client_upload(text, text, text, text) to anon, authenticated;

-- Storage policies for a public bucket named handoff-files.
-- MVP note: file URLs remain public once known, but portal data and file listings require access-code RPC verification.
insert into storage.buckets (id, name, public) values ('handoff-files', 'handoff-files', true)
on conflict (id) do update set public = true;

drop policy if exists "public read handoff files" on storage.objects;
drop policy if exists "authenticated provider uploads" on storage.objects;
drop policy if exists "public client uploads" on storage.objects;
drop policy if exists "providers update handoff files" on storage.objects;
drop policy if exists "providers delete handoff files" on storage.objects;

create policy "public read handoff files" on storage.objects
  for select using (bucket_id = 'handoff-files');

create policy "authenticated provider uploads" on storage.objects
  for insert with check (bucket_id = 'handoff-files' and auth.role() = 'authenticated');

create policy "public client uploads only" on storage.objects
  for insert with check (bucket_id = 'handoff-files' and auth.role() = 'anon' and position('/client-uploads/' in name) > 0);

create policy "providers update handoff files" on storage.objects
  for update using (bucket_id = 'handoff-files' and auth.role() = 'authenticated');

create policy "providers delete handoff files" on storage.objects
  for delete using (bucket_id = 'handoff-files' and auth.role() = 'authenticated');
