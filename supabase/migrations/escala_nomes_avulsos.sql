-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Quando a Supervisora/ADM digita um servico ou profissional que nao esta
-- cadastrado ao montar a escala, o nome digitado passa a ficar salvo pra
-- aparecer como sugestao da proxima vez (sem precisar digitar de novo).
--
-- Servico digitado -> vira uma linha normal em tipos_atendimento (mesma
-- tabela que ja alimenta o dropdown de servicos). Como so adm/admin/gestao
-- podiam gerenciar essa tabela e quem edita a escala tambem inclui
-- supervisora, libera INSERT pra ela tambem (so inserir, nao editar/excluir
-- tipos existentes).
--
-- Profissional avulso digitado -> tabela nova, separada de "atendentes"
-- (que é conta de login de verdade) - aqui e so uma lista de nomes pra
-- sugestao no dropdown, sem virar colaborador cadastrado.

drop policy if exists "tipos_atendimento_supervisora_insert" on public.tipos_atendimento;
create policy "tipos_atendimento_supervisora_insert" on public.tipos_atendimento
  for insert
  with check (public.meu_role() = 'supervisora');

create table if not exists public.escala_nomes_avulsos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  created_at timestamptz not null default now()
);

alter table public.escala_nomes_avulsos enable row level security;

drop policy if exists "escala_nomes_avulsos_select" on public.escala_nomes_avulsos;
create policy "escala_nomes_avulsos_select" on public.escala_nomes_avulsos
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'financeiro')
  );

drop policy if exists "escala_nomes_avulsos_insert" on public.escala_nomes_avulsos;
create policy "escala_nomes_avulsos_insert" on public.escala_nomes_avulsos
  for insert
  with check (
    public.meu_role() in ('adm', 'admin', 'supervisora')
  );
