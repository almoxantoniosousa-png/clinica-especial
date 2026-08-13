-- =============================================================================
-- DESPESAS RECORRENTES
--
-- Pedido do ADM: Aux Adm, Agente de Limpeza, Advogado e Contadora não geram
-- nenhum lançamento automático (diferente de AT/Especialista, cujo pagamento
-- nasce sozinho a cada atendimento registrado) — a ADM esquece de lançar o
-- pagamento deles porque nada lembra ela. Cadastra a despesa recorrente uma
-- vez só (categoria, valor, dia do vencimento) e o próprio sistema passa a
-- criar a Conta a Pagar de cada mês sozinho, avisando no sino.
-- =============================================================================

create table if not exists public.despesas_recorrentes (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text not null default 'outro',
  valor numeric not null,
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  dias_antecedencia integer not null default 5,
  ativo boolean not null default true,
  ultima_geracao date,
  observacao text,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

-- liga a conta gerada de volta pro modelo que a originou, pra saber quais
-- contas nasceram sozinhas (badge "🔁 automática") e evitar gerar duplicado
alter table public.contas_pagar add column if not exists recorrente_id uuid references public.despesas_recorrentes(id);

alter table public.despesas_recorrentes enable row level security;

-- gestão das recorrentes é exclusiva da ADM; Financeiro/Aux. Adm continuam
-- vendo a conta já gerada normalmente em contas_pagar (sem RLS própria aqui)
create policy "despesas_recorrentes_acesso" on public.despesas_recorrentes
  for all using (
    public.meu_role() in ('adm', 'admin')
  );
