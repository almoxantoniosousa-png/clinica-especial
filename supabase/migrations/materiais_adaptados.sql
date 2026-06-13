-- =============================================================================
-- MATERIAIS ADAPTADOS — acervo de livros/materiais adaptados (CAA, leitura
-- fácil, pictogramas, etc.), produzidos pelo setor de adaptação e revisados
-- por Supervisora/Gestão.
-- Rodar no SQL Editor do Supabase.
--
-- Antes de rodar: criar o bucket "materiais-adaptados" no Storage do
-- Supabase (público), igual ao "fotos-criancas".
-- =============================================================================

create table if not exists public.materiais_adaptados (
  id                 uuid primary key default gen_random_uuid(),
  titulo_livro       text not null,
  materia            text,
  serie              text,
  crianca_id         uuid references public.criancas(id),
  nivel_adaptacao    text,    -- ex: "Pictogramas/CAA", "Leitura Fácil", "Texto Ampliado", "Resumo Simplificado"
  observacoes        text,
  fotos              text[] default '{}',  -- fotos do material original e adaptado
  status             text not null default 'rascunho', -- rascunho | em_revisao | aprovado | ajustes_solicitados
  observacao_revisao text,
  criado_por         uuid not null,
  criado_por_nome    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.materiais_adaptados enable row level security;

-- Acervo: qualquer pessoa autenticada pode ver e reaproveitar materiais já adaptados
drop policy if exists "materiais_adaptados_select" on public.materiais_adaptados;
create policy "materiais_adaptados_select" on public.materiais_adaptados
  for select using (auth.uid() is not null);

-- Qualquer pessoa autenticada pode cadastrar um novo material (autoria própria)
drop policy if exists "materiais_adaptados_insert" on public.materiais_adaptados;
create policy "materiais_adaptados_insert" on public.materiais_adaptados
  for insert with check (auth.uid() is not null and criado_por = auth.uid());

-- Autor edita o próprio material; Supervisora/Gestão/Adm podem revisar (mudar status) qualquer um
drop policy if exists "materiais_adaptados_update" on public.materiais_adaptados;
create policy "materiais_adaptados_update" on public.materiais_adaptados
  for update using (
    criado_por = auth.uid()
    or public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
  );

-- Autor exclui o próprio rascunho; Adm/Gestão podem excluir qualquer um
drop policy if exists "materiais_adaptados_delete" on public.materiais_adaptados;
create policy "materiais_adaptados_delete" on public.materiais_adaptados
  for delete using (
    criado_por = auth.uid()
    or public.meu_role() in ('adm', 'admin', 'gestao')
  );

-- Storage — bucket "materiais-adaptados" (fotos dos livros/materiais)
drop policy if exists "materiais_adaptados_storage_select" on storage.objects;
create policy "materiais_adaptados_storage_select" on storage.objects
  for select using (bucket_id = 'materiais-adaptados');

drop policy if exists "materiais_adaptados_storage_insert" on storage.objects;
create policy "materiais_adaptados_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materiais-adaptados');

drop policy if exists "materiais_adaptados_storage_delete" on storage.objects;
create policy "materiais_adaptados_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materiais-adaptados' and auth.uid() = owner);
