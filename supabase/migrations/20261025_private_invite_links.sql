create table game_private.invite_links(
 token_hash text primary key,
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '7 days'),
 remaining integer not null default 1 check(remaining between 0 and 1)
);
revoke all on game_private.invite_links from public,anon,authenticated;
create function public.create_game_invite() returns text language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not public.game_member() then raise exception 'Inicia sessão numa conta convidada.';end if;
 if (select count(*) from game_private.invite_links where created_by=(select auth.uid()) and remaining>0 and expires_at>now())>=5 then raise exception 'Tens cinco convites ativos. Aguarda que sejam usados ou expirem.';end if;
 token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into game_private.invite_links(token_hash,created_by) values(encode(extensions.digest(token,'sha256'),'hex'),auth.uid());
 return token;
end $$;
revoke all on function public.create_game_invite() from public,anon;
grant execute on function public.create_game_invite() to authenticated;
create or replace function game_private.allow_signup() returns trigger language plpgsql security definer set search_path='' as $$
declare token text;hash text;allowed boolean:=false;
begin
 if coalesce((new.raw_user_meta_data->>'adult_attested')::boolean,false) is not true then raise exception 'É necessária a declaração de maioridade.';end if;
 allowed:=exists(select 1 from game_private.invitations where email=lower(new.email) and active);
 if not allowed then
  token:=new.raw_user_meta_data->>'invite_token';
  if token is not null and token ~ '^[0-9a-f]{48}$' then
   hash:=encode(extensions.digest(token,'sha256'),'hex');
   update game_private.invite_links set remaining=remaining-1 where token_hash=hash and remaining>0 and expires_at>now() returning true into allowed;
  end if;
  if coalesce(allowed,false) is not true then raise exception 'Convite inválido, utilizado ou expirado. Este jogo é privado.';end if;
  insert into game_private.invitations(email) values(lower(new.email)) on conflict(email) do update set active=true;
 end if;
 new.raw_user_meta_data:=new.raw_user_meta_data-'invite_token';
 return new;
end $$;
