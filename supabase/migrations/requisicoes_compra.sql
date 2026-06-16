-- =============================================================================
-- REQUISIÇÕES DE COMPRA — pedidos de produtos ao ADM
-- Supervisora, Gestão e Especialistas solicitam; ADM gerencia status.
-- Rodar no SQL Editor do Supabase.
-- =============================================================================

create table if not exists public.requisicoes_compra (
  id               uuid primary key default gen_random_uuid(),
  solicitante_id   uuid not null,
  solicitante_nome text not null,
  solicitante_role text not null,
  produto          text not null,
  quantidade       int not null default 1,
  descricao        text,
  link_compra      text,
  urgencia         text not null default 'normal', -- 'normal' | 'urgente'
  status           text not null default 'pendente', -- 'pendente' | 'em_analise' | 'comprado' | 'entregue' | 'recusado'
  obs_adm          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.requisicoes_compra enable row level security;

drop policy if exists "requisicoes_select" on public.requisicoes_compra;
create policy "requisicoes_select" on public.requisicoes_compra
  for select using (
    solicitante_id = auth.uid()
    or public.meu_role() in ('adm', 'admin')
  );

drop policy if exists "requisicoes_insert" on public.requisicoes_compra;
create policy "requisicoes_insert" on public.requisicoes_compra
  for insert with check (
    auth.uid() is not null
    and solicitante_id = auth.uid()
  );

drop policy if exists "requisicoes_update" on public.requisicoes_compra;
create policy "requisicoes_update" on public.requisicoes_compra
  for update using (public.meu_role() in ('adm', 'admin'));

drop policy if exists "requisicoes_delete" on public.requisicoes_compra;
create policy "requisicoes_delete" on public.requisicoes_compra
  for delete using (public.meu_role() in ('adm', 'admin'));
