create schema if not exists game_private;
revoke all on schema game_private from public,anon,authenticated;
create table game_private.invitations(email text primary key check(email=lower(email)),created_at timestamptz not null default now(),active boolean not null default true);
revoke all on game_private.invitations from public,anon,authenticated;
insert into game_private.invitations(email) values ('azevedo-biel@live.com'),('bieelazevedo666pt@gmail.com');
create function game_private.allow_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from game_private.invitations where email=lower(new.email) and active) then raise exception 'Este jogo é privado. Pede um convite ao Gabriel.'; end if;
 if coalesce((new.raw_user_meta_data->>'adult_attested')::boolean,false) is not true then raise exception 'É necessária a declaração de maioridade.'; end if;
 return new;
end $$;
revoke all on function game_private.allow_signup() from public,anon,authenticated;
create trigger game_check_invitation before insert on auth.users for each row execute function game_private.allow_signup();
create function public.game_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join game_private.invitations i on i.email=lower(u.email) where u.id=(select auth.uid()) and i.active and coalesce((u.raw_user_meta_data->>'adult_attested')::boolean,false));
$$;
revoke all on function public.game_member() from public,anon;
grant execute on function public.game_member() to authenticated;
create table public.player_saves(
 user_id uuid primary key references auth.users(id) on delete cascade,
 progress jsonb not null check(jsonb_typeof(progress)='object' and progress->>'version'='2' and octet_length(progress::text)<=64000),
 checkpoint jsonb check(checkpoint is null or (jsonb_typeof(checkpoint)='object' and checkpoint->>'version'='1' and octet_length(checkpoint::text)<=500000)),
 revision bigint not null default 1,
 adult_attested_at timestamptz not null default now(),
 privacy_version text not null default '2026-10-25',
 updated_at timestamptz not null default now()
);
alter table public.player_saves enable row level security;
revoke all on public.player_saves from public,anon;
grant select,insert,update,delete on public.player_saves to authenticated;
create policy own_save_select on public.player_saves for select to authenticated using(user_id=(select auth.uid()) and (select public.game_member()));
create policy own_save_insert on public.player_saves for insert to authenticated with check(user_id=(select auth.uid()) and (select public.game_member()));
create policy own_save_update on public.player_saves for update to authenticated using(user_id=(select auth.uid()) and (select public.game_member())) with check(user_id=(select auth.uid()) and (select public.game_member()));
create policy own_save_delete on public.player_saves for delete to authenticated using(user_id=(select auth.uid()) and (select public.game_member()));
create function public.save_player_progress(p_progress jsonb,p_checkpoint jsonb,p_expected_revision bigint) returns bigint language plpgsql security invoker set search_path='' as $$
declare result bigint;
begin
 if not public.game_member() then raise exception 'Acesso privado não autorizado.';end if;
 insert into public.player_saves(user_id,progress,checkpoint) values(auth.uid(),p_progress,p_checkpoint)
 on conflict(user_id) do update set progress=excluded.progress,checkpoint=excluded.checkpoint,revision=public.player_saves.revision+1,updated_at=now()
 where public.player_saves.revision=p_expected_revision returning revision into result;
 if result is null then raise exception 'Progresso atualizado noutro dispositivo. Sincroniza novamente.' using errcode='40001';end if;
 return result;
end $$;
revoke all on function public.save_player_progress(jsonb,jsonb,bigint) from public,anon;
grant execute on function public.save_player_progress(jsonb,jsonb,bigint) to authenticated;
create function public.invite_game_friend(p_email text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=(select auth.uid()) and lower(email) in ('azevedo-biel@live.com','bieelazevedo666pt@gmail.com')) then raise exception 'Só o responsável pode gerir convites.';end if;
 if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Email inválido.';end if;
 insert into game_private.invitations(email) values(lower(trim(p_email))) on conflict(email) do update set active=true;
end $$;
revoke all on function public.invite_game_friend(text) from public,anon;
grant execute on function public.invite_game_friend(text) to authenticated;
create function public.delete_game_account() returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());
begin
 if uid is null or not public.game_member() then raise exception 'Sessão inválida.';end if;
 if not exists(select 1 from auth.sessions where user_id=uid and id=((select auth.jwt())->>'session_id')::uuid) then raise exception 'Volta a iniciar sessão antes de apagar a conta.';end if;
 delete from game_private.invitations where email=(select lower(email) from auth.users where id=uid);
 delete from auth.users where id=uid;
end $$;
revoke all on function public.delete_game_account() from public,anon;
grant execute on function public.delete_game_account() to authenticated;
