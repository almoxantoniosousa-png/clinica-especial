-- BUG SISTÊMICO: duas triggers em atendimentos criavam duas linhas em
-- financeiro por sessão lançada — inserir_financeiro (correta, com
-- horas/valor real) e inserir_financeiro_automatico (linha fantasma de
-- R$100,00 fixo, sem relação com o trabalho real). Confirmado: 67
-- atendimentos afetados, R$6.700,00 em linhas fantasma, todas ainda
-- "pendente" (nenhuma paga, sem prejuízo real até agora).

-- 1) Remove a trigger e a função duplicadas.
drop trigger if exists trigger_inserir_financeiro on public.atendimentos;
drop function if exists public.inserir_financeiro_automatico();

-- 2) Apaga as 67 linhas fantasma já existentes (valor fixo 100, sem
-- horas/valor_total, ainda pendentes — assinatura exata da trigger
-- removida, não afeta lançamentos reais).
delete from public.financeiro
where valor = 100.00
  and horas is null
  and valor_total is null
  and status = 'pendente';
