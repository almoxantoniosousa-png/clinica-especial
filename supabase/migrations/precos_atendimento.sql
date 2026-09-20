-- Tabela de valores por sessao, por crianca + especialidade. Pedido da
-- Solange (Gestao): hoje o valor de cada especialidade e' digitado do zero
-- toda vez que se cria uma fatura, mesmo sendo quase sempre o mesmo valor
-- (definido pela autorizacao do plano de saude de cada crianca). Essa
-- tabela guarda esse valor "de cor", e o formulario de Nova Fatura passa a
-- preencher sozinho quando a especialidade e' selecionada.
create table if not exists public.precos_atendimento (
  id                   uuid primary key default gen_random_uuid(),
  crianca_id           uuid not null references public.criancas(id) on delete cascade,
  especialidade        text not null,
  valor_sessao         numeric(10,2) not null default 0,
  atualizado_em        timestamptz not null default now(),
  atualizado_por_nome  text,
  unique (crianca_id, especialidade)
);

alter table public.precos_atendimento enable row level security;

-- Mesmo grupo de acesso do Faturamento (financeiro_acesso), mais Gestao.
create policy "precos_atendimento_acesso" on public.precos_atendimento
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro', 'aux_adm', 'gestao'))
  with check (public.meu_role() in ('adm', 'admin', 'financeiro', 'aux_adm', 'gestao'));
