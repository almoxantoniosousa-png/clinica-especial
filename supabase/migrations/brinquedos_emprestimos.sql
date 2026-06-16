-- =============================================================================
-- BRINQUEDOS — catálogo e controle de empréstimo de brinquedos
-- Fluxo: Atendente/Especialista solicita → ADM registra retirada → ADM registra devolução
-- Rodar no SQL Editor do Supabase.
-- =============================================================================

-- Catálogo de brinquedos (cresce a partir das solicitações)
create table if not exists public.brinquedos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  foto_url   text,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.brinquedos enable row level security;

drop policy if exists "brinquedos_select" on public.brinquedos;
create policy "brinquedos_select" on public.brinquedos
  for select using (auth.uid() is not null);

drop policy if exists "brinquedos_insert" on public.brinquedos;
create policy "brinquedos_insert" on public.brinquedos
  for insert with check (auth.uid() is not null);

drop policy if exists "brinquedos_update" on public.brinquedos;
create policy "brinquedos_update" on public.brinquedos
  for update using (public.meu_role() in ('adm', 'admin', 'aux_adm'));

drop policy if exists "brinquedos_delete" on public.brinquedos;
create policy "brinquedos_delete" on public.brinquedos
  for delete using (public.meu_role() in ('adm', 'admin', 'aux_adm'));

-- Registros de solicitação / retirada / devolução
create table if not exists public.brinquedos_emprestimos (
  id               uuid primary key default gen_random_uuid(),
  brinquedo_id     uuid references public.brinquedos(id) on delete set null,
  brinquedo_nome   text not null,
  solicitante_id   uuid not null,
  solicitante_nome text not null,
  solicitante_role text not null, -- 'atendente' | 'especialista'
  crianca_id       uuid references public.criancas(id) on delete set null,
  crianca_nome     text not null,
  status           text not null default 'solicitado', -- 'solicitado' | 'retirado' | 'devolvido'
  obs              text,
  data_solicitacao timestamptz not null default now(),
  data_retirada    timestamptz,
  data_devolucao   timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.brinquedos_emprestimos enable row level security;

drop policy if exists "brinquedos_emprestimos_select" on public.brinquedos_emprestimos;
create policy "brinquedos_emprestimos_select" on public.brinquedos_emprestimos
  for select using (
    solicitante_id = auth.uid()
    or public.meu_role() in ('adm', 'admin', 'gestao', 'aux_adm')
  );

drop policy if exists "brinquedos_emprestimos_insert" on public.brinquedos_emprestimos;
create policy "brinquedos_emprestimos_insert" on public.brinquedos_emprestimos
  for insert with check (
    auth.uid() is not null
    and solicitante_id = auth.uid()
  );

drop policy if exists "brinquedos_emprestimos_update" on public.brinquedos_emprestimos;
create policy "brinquedos_emprestimos_update" on public.brinquedos_emprestimos
  for update using (public.meu_role() in ('adm', 'admin', 'aux_adm'));

drop policy if exists "brinquedos_emprestimos_delete" on public.brinquedos_emprestimos;
create policy "brinquedos_emprestimos_delete" on public.brinquedos_emprestimos
  for delete using (public.meu_role() in ('adm', 'admin', 'aux_adm'));

-- Storage — bucket "brinquedos-fotos" (fotos dos brinquedos do catálogo)
-- Criar o bucket manualmente no Supabase Dashboard > Storage > New bucket
-- Nome: brinquedos-fotos, Public: true
drop policy if exists "brinquedos_fotos_select" on storage.objects;
create policy "brinquedos_fotos_select" on storage.objects
  for select using (bucket_id = 'brinquedos-fotos');

drop policy if exists "brinquedos_fotos_insert" on storage.objects;
create policy "brinquedos_fotos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brinquedos-fotos' and public.meu_role() in ('adm', 'admin', 'aux_adm'));

drop policy if exists "brinquedos_fotos_delete" on storage.objects;
create policy "brinquedos_fotos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brinquedos-fotos' and public.meu_role() in ('adm', 'admin', 'aux_adm'));
