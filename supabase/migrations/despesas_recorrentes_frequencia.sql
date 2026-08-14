-- =============================================================================
-- FREQUÊNCIA DAS DESPESAS RECORRENTES
--
-- Até aqui toda despesa recorrente era mensal fixa. Mas a clínica tem
-- despesas fixas que só vencem a cada trimestre (DARF CSLL, DARF IRPJ) —
-- a ADM pediu que o sistema lembre desses também, mesmo não sendo mensais.
-- Generaliza a recorrência pra "a cada N meses" (1 = mensal, 3 = trimestral,
-- 6 = semestral, 12 = anual), sem quebrar as recorrentes já cadastradas
-- (todas continuam mensais, frequencia_meses = 1 por padrão).
-- =============================================================================

alter table public.despesas_recorrentes
  add column if not exists frequencia_meses integer not null default 1;

alter table public.despesas_recorrentes
  add constraint despesas_recorrentes_frequencia_valida check (frequencia_meses in (1, 2, 3, 6, 12));
