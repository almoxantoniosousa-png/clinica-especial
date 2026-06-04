-- Extensões necessárias
create extension if not exists "pgcrypto";

-- Tipos ENUM
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('adm', 'atendente');
  end if;

  if not exists (select 1 from pg_type where typname = 'local_atendimento') then
    create type local_atendimento as enum ('casa', 'escola');
  end if;

  if not exists (select 1 from pg_type where typname = 'status_atendimento') then
    create type status_atendimento as enum ('pendente', 'aprovado', 'pago');
  end if;
end $$;

-- Perfis
create table if not exists public.perfis (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nome text not null,
  role user_role not null default 'atendente',
  logo_url text,
  created_at timestamptz not null default now()
);

-- Crianças
create table if not exists public.criancas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento date,
  responsavel text,
  created_at timestamptz not null default now()
);

-- Atendimentos
create table if not exists public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  atendente_id uuid not null references public.perfis(id) on delete cascade,
  crianca_id uuid not null references public.criancas(id) on delete cascade,
  data date not null,
  horas numeric(10,2) not null check (horas > 0),
  local local_atendimento not null,
  valor_hora numeric(10,2) not null check (valor_hora >= 0),
  valor_total numeric(10,2) generated always as (horas * valor_hora) stored,
  ocorrencia text,
  status status_atendimento not null default 'pendente',
  created_at timestamptz not null default now()
);

-- Mensagens
create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  remetente_id uuid not null references public.perfis(id) on delete cascade,
  destinatario_id uuid references public.perfis(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.perfis enable row level security;
alter table public.criancas enable row level security;
alter table public.atendimentos enable row level security;
alter table public.mensagens enable row level security;

-- Políticas RLS

-- Perfis
create policy perfis_select_adm on public.perfis
  for select using (auth.uid() is not null and exists (
    select 1 from public.perfis p where p.id = auth.uid() and p.role = 'adm'
  ));

create policy perfis_select_self on public.perfis
  for select using (id = auth.uid());

-- Crianças
create policy criancas_select_adm on public.criancas
  for select using (auth.uid() is not null and exists (
    select 1 from public.perfis p where p.id = auth.uid() and p.role = 'adm'
  ));

create policy criancas_select_atendente on public.criancas
  for select using (auth.uid() is not null);

-- Atendimentos
create policy atendimentos_select_adm on public.atendimentos
  for select using (auth.uid() is not null and exists (
    select 1 from public.perfis p where p.id = auth.uid() and p.role = 'adm'
  ));

create policy atendimentos_select_self on public.atendimentos
  for select using (atendente_id = auth.uid());

create policy atendimentos_insert_self on public.atendimentos
  for insert with check (atendente_id = auth.uid());

-- Mensagens
create policy mensagens_select_adm on public.mensagens
  for select using (auth.uid() is not null and exists (
    select 1 from public.perfis p where p.id = auth.uid() and p.role = 'adm'
  ));

create policy mensagens_select_self on public.mensagens
  for select using (remetente_id = auth.uid() or destinatario_id = auth.uid());

create policy mensagens_insert_self on public.mensagens
  for insert with check (remetente_id = auth.uid());

-- Chat: conversas privadas entre usuários
-- ATENÇÃO: rodar no SQL Editor do Supabase antes de usar o chat
--
--   ALTER TABLE public.conversas
--     ADD COLUMN IF NOT EXISTS participante_a uuid REFERENCES public.perfis(id) ON DELETE CASCADE,
--     ADD COLUMN IF NOT EXISTS participante_b uuid REFERENCES public.perfis(id) ON DELETE CASCADE;
--
--   ALTER TABLE public.conversas       ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.mensagens_chat  ENABLE ROW LEVEL SECURITY;
--
--   CREATE POLICY conversas_select ON public.conversas
--     FOR SELECT USING (participante_a = auth.uid() OR participante_b = auth.uid());
--
--   CREATE POLICY conversas_insert ON public.conversas
--     FOR INSERT WITH CHECK (participante_a = auth.uid() OR participante_b = auth.uid());
--
--   CREATE POLICY mensagens_chat_select ON public.mensagens_chat
--     FOR SELECT USING (
--       EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = conversa_id
--               AND (c.participante_a = auth.uid() OR c.participante_b = auth.uid()))
--     );
--
--   CREATE POLICY mensagens_chat_insert ON public.mensagens_chat
--     FOR INSERT WITH CHECK (
--       autor_id = auth.uid() AND
--       EXISTS (SELECT 1 FROM public.conversas c WHERE c.id = conversa_id
--               AND (c.participante_a = auth.uid() OR c.participante_b = auth.uid()))
--     );

-- Storage: bucket chat-uploads (criado via API, public=true)
-- Políticas RLS para storage.objects
create policy "chat_uploads_select" on storage.objects
  for select using (bucket_id = 'chat-uploads');

create policy "chat_uploads_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-uploads');

create policy "chat_uploads_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-uploads' and auth.uid() = owner);
