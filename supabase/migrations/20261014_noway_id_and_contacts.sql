-- NOWAY ID / primeira migração
-- Aplicar num projeto Supabase exclusivo da NOWAY.
-- Não promove usuários por e-mail nem por dados recebidos do navegador.
-- O Founder inicial deve ser promovido via SQL pelo operador após o primeiro login.

create type public.noway_role as enum ('membro','jogador','manager','owner');
create type public.noway_contact_category as enum ('geral','fa','parceria','recrutamento','outro');
create type public.noway_contact_status as enum ('aberta','aguardando','respondida','resolvida');

create table public.noway_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Membro',
  avatar_url text,
  role public.noway_role not null default 'membro',
  created_at timestamptz not null default now(),
  constraint display_name_valid check (length(trim(display_name)) between 1 and 80)
);

create table public.noway_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.noway_profiles(id) on delete cascade,
  category public.noway_contact_category not null,
  subject text not null,
  status public.noway_contact_status not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_valid check (length(trim(subject)) between 4 and 180)
);
create index noway_contacts_user_date_idx on public.noway_contacts(user_id, created_at desc);
create index noway_contacts_status_date_idx on public.noway_contacts(status, updated_at desc);

create table public.noway_contact_messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.noway_contacts(id) on delete cascade,
  sender_id uuid not null references public.noway_profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint contact_body_valid check (length(trim(body)) between 1 and 5000)
);
create index noway_contact_messages_contact_date_idx on public.noway_contact_messages(contact_id, created_at);

create function public.noway_is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.noway_profiles p
    where p.id = (select auth.uid()) and p.role = 'owner'
  );
$$;

create function public.noway_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.noway_profiles (id,display_name,avatar_url)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'full_name'),80),''),
             nullif(left(trim(new.raw_user_meta_data ->> 'name'),80),''),
             'Membro'),
    nullif(left(new.raw_user_meta_data ->> 'avatar_url',500),'')
  );
  return new;
end;
$$;

create trigger noway_auth_signup
after insert on auth.users
for each row execute function public.noway_new_auth_user();

create function public.noway_update_display_name(new_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or length(trim(new_name)) not between 1 and 80 then
    raise exception 'Nome inválido';
  end if;
  update public.noway_profiles set display_name=trim(new_name) where id=(select auth.uid());
end;
$$;

-- Só a conta proprietária pode atribuir papéis, e nunca por dado enviado pelo Google.
-- A permissão owner é concedida somente via SQL administrativo.
create function public.noway_set_member_role(target_id uuid, next_role public.noway_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.noway_is_owner() then raise exception 'Sem permissão'; end if;
  if next_role not in ('membro','jogador','manager') then
    raise exception 'Papel não permitido';
  end if;
  if exists (select 1 from public.noway_profiles where id=target_id and role='owner') then
    raise exception 'Não é possível alterar o owner';
  end if;
  update public.noway_profiles set role=next_role where id=target_id;
  if not found then raise exception 'Usuário não encontrado'; end if;
end;
$$;

create function public.noway_contact_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.noway_contacts set updated_at=now()
  where id = new.contact_id;
  return new;
end;
$$;
create trigger noway_contact_message_touch
after insert on public.noway_contact_messages
for each row execute function public.noway_contact_touch();

alter table public.noway_profiles enable row level security;
alter table public.noway_contacts enable row level security;
alter table public.noway_contact_messages enable row level security;

-- Não existe política pública de UPDATE nos papéis: só as funções restritas.
create policy "Ver proprio perfil ou perfis administrados"
on public.noway_profiles for select to authenticated
using (id=(select auth.uid()) or (select public.noway_is_owner()));

create policy "Ver proprios contatos ou caixa do owner"
on public.noway_contacts for select to authenticated
using (user_id=(select auth.uid()) or (select public.noway_is_owner()));

create policy "Abrir solicitacao na propria conta"
on public.noway_contacts for insert to authenticated
with check (user_id=(select auth.uid()) and status='aberta');

create policy "Owner organiza solicitacoes"
on public.noway_contacts for update to authenticated
using ((select public.noway_is_owner()))
with check ((select public.noway_is_owner()));

create policy "Ler mensagens de uma conversa autorizada"
on public.noway_contact_messages for select to authenticated
using (exists (
  select 1 from public.noway_contacts c
  where c.id=contact_id
    and (c.user_id=(select auth.uid()) or (select public.noway_is_owner()))
));

create policy "Responder na propria solicitacao ou como owner"
on public.noway_contact_messages for insert to authenticated
with check (
  sender_id=(select auth.uid())
  and exists(
    select 1 from public.noway_contacts c
    where c.id=contact_id
      and c.status <> 'resolvida'
      and (c.user_id=(select auth.uid()) or (select public.noway_is_owner()))
  )
);

revoke all on function public.noway_is_owner() from public;
revoke all on function public.noway_update_display_name(text) from public;
revoke all on function public.noway_set_member_role(uuid,public.noway_role) from public;
grant execute on function public.noway_is_owner() to authenticated;
grant execute on function public.noway_update_display_name(text) to authenticated;
grant execute on function public.noway_set_member_role(uuid,public.noway_role) to authenticated;

grant select on public.noway_profiles,public.noway_contacts,public.noway_contact_messages to authenticated;
grant insert on public.noway_contacts,public.noway_contact_messages to authenticated;
grant update(status) on public.noway_contacts to authenticated;

-- Inicialização segura do primeiro proprietário (executar no SQL Editor, uma vez):
-- update public.noway_profiles set role='owner' where id='<UUID-AUTH-DO-NIEL>';
