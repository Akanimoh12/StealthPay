-- ===========================================================================
-- StealthPay — waitlist schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- ===========================================================================

-- 1. Table -------------------------------------------------------------------
create table if not exists public.waitlist (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  company    text,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness is enforced in the API by lowercasing the email
-- before insert, so the plain unique constraint above is sufficient.

comment on table  public.waitlist is 'StealthPay early-access waitlist signups.';
comment on column public.waitlist.email   is 'Signup email, stored lowercased.';
comment on column public.waitlist.company is 'Optional company name.';

-- 2. Row Level Security ------------------------------------------------------
-- Enable RLS so the table is locked down by default. With RLS on and NO
-- permissive policy for the anon/authenticated roles, the public (browser)
-- key cannot read or write the table at all.
--
-- Our /api/waitlist Route Handler uses the SERVICE ROLE key, which bypasses
-- RLS entirely — so inserts from the server keep working. This is exactly the
-- posture we want: nothing client-side can read the email list or insert
-- directly; all writes flow through our validated server endpoint.

alter table public.waitlist enable row level security;

-- (Optional, explicit) Deny-all policy for the anon role. RLS already blocks
-- access without a policy; this makes the intent unmistakable and is safe to
-- keep. Drop it first if re-running.
drop policy if exists "no public access to waitlist" on public.waitlist;
create policy "no public access to waitlist"
  on public.waitlist
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ===========================================================================
-- Done. Verify with:  select * from public.waitlist;  (works in the SQL editor,
-- which runs as a privileged role.)
-- ===========================================================================
