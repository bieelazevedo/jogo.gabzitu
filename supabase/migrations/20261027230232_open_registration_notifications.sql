-- Apply with the simplified signup UI. No API keys belong in this migration.
begin;
create or replace function game_private.allow_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email is null or coalesce((new.raw_user_meta_data->>'adult_attested')::boolean,false) is not true then
  raise exception 'Confirma o email e a declaração de maioridade.';
 end if;
 -- Existing RLS continues to use game_member; registration now grants ordinary membership.
 insert into game_private.invitations(email) values(lower(new.email)) on conflict(email) do update set active=true;
 new.raw_user_meta_data:=new.raw_user_meta_data-'invite_token';
 return new;
end $$;
revoke all on function game_private.allow_signup() from public,anon,authenticated;

create table game_private.signup_notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique not null references auth.users(id) on delete cascade,
 email text not null,
 display_name text not null default '',
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 lease_until timestamptz,
 last_error text
);
alter table game_private.signup_notifications enable row level security;
revoke all on game_private.signup_notifications from public,anon,authenticated;
create function game_private.queue_signup_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into game_private.signup_notifications(user_id,email,display_name)
 values(new.id,new.email,left(coalesce(new.raw_user_meta_data->>'display_name',''),80)) on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function game_private.queue_signup_notification() from public,anon,authenticated;
create trigger game_signup_notification after insert on auth.users for each row execute function game_private.queue_signup_notification();

create function public.claim_signup_notifications(p_id uuid default null)
returns table(id uuid,email text,display_name text,created_at timestamptz)
language sql security definer set search_path='' as $$
 with candidates as (
  select n.id from game_private.signup_notifications n
  where n.sent_at is null and n.attempts<20 and n.next_attempt_at<=now()
   and (n.lease_until is null or n.lease_until<now()) and (p_id is null or n.id=p_id)
  order by n.created_at for update skip locked limit 10
 ), claimed as (
  update game_private.signup_notifications n set lease_until=now()+interval '2 minutes',attempts=n.attempts+1
  from candidates c where n.id=c.id returning n.id,n.email,n.display_name,n.created_at
 ) select * from claimed;
$$;
create function public.finish_signup_notification(p_id uuid,p_success boolean,p_error text default null)
returns void language sql security definer set search_path='' as $$
 update game_private.signup_notifications set sent_at=case when p_success then now() else sent_at end,
 lease_until=null,next_attempt_at=now()+interval '5 minutes',last_error=case when p_success then null else left(p_error,200) end
 where id=p_id and sent_at is null;
$$;
revoke all on function public.claim_signup_notifications(uuid) from public,anon,authenticated;
revoke all on function public.finish_signup_notification(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.claim_signup_notifications(uuid) to service_role;
grant execute on function public.finish_signup_notification(uuid,boolean,text) to service_role;
commit;
