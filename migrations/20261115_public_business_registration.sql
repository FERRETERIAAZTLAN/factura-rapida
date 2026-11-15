begin;

create schema if not exists private;

create table if not exists private.public_signup_requests (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  business_name text not null,
  business_code text not null unique,
  code_hash text not null,
  ip_hash text not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  verified_at timestamptz,
  completed_at timestamptz,
  business_id uuid references public.businesses(id),
  admin_user_id uuid references public.app_users(id),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table private.public_signup_requests enable row level security;

create index if not exists public_signup_requests_email_created_idx
  on private.public_signup_requests (lower(email), created_at desc);

create index if not exists public_signup_requests_ip_created_idx
  on private.public_signup_requests (ip_hash, created_at desc);

create index if not exists public_signup_requests_expires_idx
  on private.public_signup_requests (expires_at)
  where completed_at is null;

create index if not exists public_signup_requests_business_idx
  on private.public_signup_requests (business_id);

create index if not exists public_signup_requests_admin_user_idx
  on private.public_signup_requests (admin_user_id);

revoke all on table private.public_signup_requests from public, anon, authenticated;
grant select, insert, update on table private.public_signup_requests to service_role;

create or replace function public.start_public_business_signup(
  p_token_hash text,
  p_email text,
  p_business_name text,
  p_business_code text,
  p_email_code text,
  p_ip_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := btrim(coalesce(p_business_name, ''));
  v_code text := upper(btrim(coalesce(p_business_code, '')));
  v_request_id uuid;
  v_recent_email integer;
  v_recent_ip integer;
  v_recent_global integer;
begin
  if coalesce(p_token_hash, '') !~ '^[a-f0-9]{64}$' or coalesce(p_ip_hash, '') !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_SIGNUP_TOKEN';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email) > 254 then
    raise exception 'INVALID_EMAIL';
  end if;
  if char_length(v_name) < 3 or char_length(v_name) > 120 then
    raise exception 'INVALID_BUSINESS_NAME';
  end if;
  if v_code !~ '^[A-Z0-9]{8,20}$' then
    raise exception 'INVALID_BUSINESS_CODE';
  end if;
  if coalesce(p_email_code, '') !~ '^[0-9]{6}$' then
    raise exception 'INVALID_EMAIL_CODE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 1));

  if exists (select 1 from public.app_users where lower(email) = v_email) then
    raise exception 'EMAIL_ALREADY_REGISTERED';
  end if;
  if exists (select 1 from public.businesses where upper(code) = v_code) then
    raise exception 'BUSINESS_CODE_TAKEN';
  end if;

  select count(*) into v_recent_email
  from private.public_signup_requests
  where lower(email) = v_email and created_at > now() - interval '24 hours';

  select count(*) into v_recent_ip
  from private.public_signup_requests
  where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';

  select count(*) into v_recent_global
  from private.public_signup_requests
  where created_at > now() - interval '24 hours';

  if v_recent_email >= 3 or v_recent_ip >= 6 or v_recent_global >= 100 then
    raise exception 'RATE_LIMIT';
  end if;

  update private.public_signup_requests
  set expires_at = least(expires_at, now())
  where lower(email) = v_email
    and completed_at is null
    and expires_at > now();

  begin
    insert into private.public_signup_requests (
      token_hash, email, business_name, business_code, code_hash, ip_hash, expires_at
    ) values (
      p_token_hash,
      v_email,
      v_name,
      v_code,
      extensions.crypt(p_email_code, extensions.gen_salt('bf', 8)),
      p_ip_hash,
      now() + interval '10 minutes'
    ) returning id into v_request_id;
  exception when unique_violation then
    raise exception 'BUSINESS_CODE_TAKEN';
  end;

  return jsonb_build_object(
    'request_id', v_request_id,
    'business_code', v_code,
    'expires_in_seconds', 600
  );
end;
$function$;

create or replace function public.verify_public_business_signup(
  p_token text,
  p_email text,
  p_code text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_token_hash text;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_request private.public_signup_requests%rowtype;
begin
  if char_length(coalesce(p_token, '')) < 40 then
    raise exception 'SIGNUP_EXPIRED';
  end if;
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select * into v_request
  from private.public_signup_requests
  where token_hash = v_token_hash
    and lower(email) = v_email
    and completed_at is null
  for update;

  if not found or v_request.expires_at <= now() then
    raise exception 'SIGNUP_EXPIRED';
  end if;
  if v_request.attempts >= 5 then
    raise exception 'CODE_LOCKED';
  end if;

  if extensions.crypt(coalesce(p_code, ''), v_request.code_hash) <> v_request.code_hash then
    update private.public_signup_requests
    set attempts = least(attempts + 1, 5)
    where id = v_request.id;
    return jsonb_build_object(
      'verified', false,
      'attempts_remaining', greatest(0, 4 - v_request.attempts)
    );
  end if;

  update private.public_signup_requests
  set verified_at = coalesce(verified_at, now()),
      expires_at = greatest(expires_at, now() + interval '30 minutes')
  where id = v_request.id
  returning * into v_request;

  return jsonb_build_object(
    'verified', true,
    'business_code', v_request.business_code,
    'verified_at', v_request.verified_at
  );
end;
$function$;

create or replace function public.complete_public_business_signup(
  p_token text,
  p_email text,
  p_admin_name text,
  p_username text,
  p_pin text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_token_hash text;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_admin_name text := btrim(coalesce(p_admin_name, ''));
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_request private.public_signup_requests%rowtype;
  v_business_id uuid;
  v_user_id uuid;
begin
  if char_length(coalesce(p_token, '')) < 40 then
    raise exception 'SIGNUP_EXPIRED';
  end if;
  if char_length(v_admin_name) < 2 or char_length(v_admin_name) > 120 then
    raise exception 'INVALID_ADMIN_NAME';
  end if;
  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,49}$' then
    raise exception 'INVALID_USERNAME';
  end if;
  if coalesce(p_pin, '') !~ '^[0-9]{6,8}$' then
    raise exception 'INVALID_PIN';
  end if;

  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  select * into v_request
  from private.public_signup_requests
  where token_hash = v_token_hash
    and lower(email) = v_email
    and completed_at is null
  for update;

  if not found or v_request.expires_at <= now() then
    raise exception 'SIGNUP_EXPIRED';
  end if;
  if v_request.verified_at is null then
    raise exception 'NOT_VERIFIED';
  end if;
  if exists (select 1 from public.app_users where lower(email) = v_email) then
    raise exception 'EMAIL_ALREADY_REGISTERED';
  end if;
  if exists (select 1 from public.businesses where upper(code) = upper(v_request.business_code)) then
    raise exception 'BUSINESS_CODE_TAKEN';
  end if;

  insert into public.businesses (
    name, code, cfdi_version, series, next_folio, contact_email, auto_send_cfdi_email
  ) values (
    v_request.business_name,
    upper(v_request.business_code),
    '4.0',
    'A',
    1,
    v_email,
    false
  ) returning id into v_business_id;

  insert into public.app_users (
    business_id, name, username, pin_hash, role, active, email, email_verified_at
  ) values (
    v_business_id,
    v_admin_name,
    v_username,
    public.hash_app_pin(p_pin),
    'admin',
    true,
    v_email,
    v_request.verified_at
  ) returning id into v_user_id;

  insert into private.cfdi_provider_config (business_id, environment)
  values (v_business_id, 'sandbox')
  on conflict (business_id) do nothing;

  update private.public_signup_requests
  set completed_at = now(), business_id = v_business_id, admin_user_id = v_user_id
  where id = v_request.id;

  insert into public.audit_logs (
    business_id, user_id, action, entity_type, entity_id, details
  ) values (
    v_business_id,
    v_user_id,
    'business.public_signup_completed',
    'business',
    v_business_id::text,
    jsonb_build_object('business_code', upper(v_request.business_code), 'email_verified', true)
  );

  return jsonb_build_object(
    'business_id', v_business_id,
    'business_name', v_request.business_name,
    'business_code', upper(v_request.business_code),
    'admin_user_id', v_user_id,
    'username', v_username
  );
end;
$function$;

create or replace function public.expire_public_business_signup(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_token_hash text;
begin
  v_token_hash := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  update private.public_signup_requests
  set expires_at = least(expires_at, now())
  where token_hash = v_token_hash and completed_at is null;
  return found;
end;
$function$;

revoke execute on function public.start_public_business_signup(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.verify_public_business_signup(text, text, text) from public, anon, authenticated;
revoke execute on function public.complete_public_business_signup(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.expire_public_business_signup(text) from public, anon, authenticated;

grant execute on function public.start_public_business_signup(text, text, text, text, text, text) to service_role;
grant execute on function public.verify_public_business_signup(text, text, text) to service_role;
grant execute on function public.complete_public_business_signup(text, text, text, text, text) to service_role;
grant execute on function public.expire_public_business_signup(text) to service_role;

commit;
