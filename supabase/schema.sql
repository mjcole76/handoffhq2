-- HandOffHQ / ClientDock MVP schema
-- Run this in Supabase SQL editor, then create a public storage bucket named: handoff-files

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
  access_code text,
  created_at timestamptz default now()
);

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

create policy "users own profile" on public.users for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "public can read provider branding" on public.users for select using (true);

create policy "providers manage own clients" on public.clients for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
create policy "public can read client portal by slug" on public.clients for select using (true);

create policy "providers manage own files" on public.files for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
create policy "public can read portal files" on public.files for select using (true);
create policy "public can upload client files" on public.files for insert with check (uploaded_by = 'client' and file_type = 'client_upload');

create policy "providers manage own milestones" on public.milestones for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
create policy "public can read milestones" on public.milestones for select using (true);

create policy "providers manage own approvals" on public.approvals for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
create policy "public can read approvals" on public.approvals for select using (true);
create policy "public can update approval status" on public.approvals for update using (true) with check (status in ('approved', 'changes_requested'));

create policy "providers manage own invoices" on public.invoices for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
create policy "public can read invoices" on public.invoices for select using (true);

create policy "providers manage own updates" on public.updates for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
create policy "public can read updates" on public.updates for select using (true);

-- Storage policies for a public bucket named handoff-files.
-- Create bucket manually in Storage or run insert below if allowed.
insert into storage.buckets (id, name, public) values ('handoff-files', 'handoff-files', true)
on conflict (id) do update set public = true;

create policy "public read handoff files" on storage.objects for select using (bucket_id = 'handoff-files');
create policy "authenticated provider uploads" on storage.objects for insert with check (bucket_id = 'handoff-files' and auth.role() = 'authenticated');
create policy "public client uploads" on storage.objects for insert with check (bucket_id = 'handoff-files');
create policy "providers update handoff files" on storage.objects for update using (bucket_id = 'handoff-files' and auth.role() = 'authenticated');
create policy "providers delete handoff files" on storage.objects for delete using (bucket_id = 'handoff-files' and auth.role() = 'authenticated');
