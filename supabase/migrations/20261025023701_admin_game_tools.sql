create table game_private.admin_game_proofs(
 token_hash text primary key, room text not null,
 created_by uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '10 minutes'
);
alter table game_private.admin_game_proofs enable row level security;
revoke all on game_private.admin_game_proofs from public,anon,authenticated;
create index admin_game_proofs_created_by on game_private.admin_game_proofs(created_by);
create function game_private.is_game_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join game_private.invitations i on i.email=lower(u.email)
 where u.id=(select auth.uid()) and lower(u.email)='azevedo-biel@live.com' and u.email_confirmed_at is not null and i.active);
$$;
create function game_private.issue_admin_proof(p_room text) returns text language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not game_private.is_game_admin() then raise exception 'Só o administrador pode usar este modo.'; end if;
 if p_room is null or length(p_room)<8 or length(p_room)>128 then raise exception 'Sala inválida.'; end if;
 delete from game_private.admin_game_proofs where expires_at<now() or created_by=auth.uid();
 token=encode(extensions.gen_random_bytes(24),'hex');
 insert into game_private.admin_game_proofs(token_hash,room,created_by) values(encode(extensions.digest(token,'sha256'),'hex'),p_room,auth.uid());
 return token;
end $$;
create function game_private.consume_admin_proof(p_room text,p_proof text) returns boolean language plpgsql security definer set search_path='' as $$
declare found_id uuid;
begin
 if not public.game_member() or p_proof is null or length(p_proof)<>48 then return false; end if;
 delete from game_private.admin_game_proofs p using auth.users u,game_private.invitations i
 where p.created_by=u.id and i.email=lower(u.email) and i.active
 and lower(u.email)='azevedo-biel@live.com' and u.email_confirmed_at is not null
 and p.room=p_room and p.expires_at>now() and p.token_hash=encode(extensions.digest(p_proof,'sha256'),'hex')
 returning p.created_by into found_id;
 return found_id is not null;
end $$;
revoke all on function game_private.is_game_admin(),game_private.issue_admin_proof(text),game_private.consume_admin_proof(text,text) from public,anon;
grant usage on schema game_private to authenticated;
grant execute on function game_private.is_game_admin(),game_private.issue_admin_proof(text),game_private.consume_admin_proof(text,text) to authenticated;
create function public.game_admin() returns boolean language sql stable security invoker set search_path='' as $$ select game_private.is_game_admin(); $$;
create function public.issue_admin_game_proof(p_room text) returns text language sql security invoker set search_path='' as $$ select game_private.issue_admin_proof(p_room); $$;
create function public.consume_admin_game_proof(p_room text,p_proof text) returns boolean language sql security invoker set search_path='' as $$ select game_private.consume_admin_proof(p_room,p_proof); $$;
revoke all on function public.game_admin(),public.issue_admin_game_proof(text),public.consume_admin_game_proof(text,text) from public,anon;
grant execute on function public.game_admin(),public.issue_admin_game_proof(text),public.consume_admin_game_proof(text,text) to authenticated;
