-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Da pra aux_adm acesso so ao Faturamento (contas_pagar/contas_receber),
-- sem tocar em folha_pagamento nem emprestimos_colaboradores (dado salarial,
-- fica restrito a adm/admin/financeiro/gestao como ja era).
--
-- De quebra, corrige contas_pagar_modelos: essa tabela nunca ganhou a
-- politica "financeiro_acesso" quando as outras duas foram migradas pra
-- meu_role() — ainda dependia da tabela "perfis" (antiga), deixando o
-- atalho de "contas salvas" fora do ar mesmo pro role financeiro.

drop policy if exists "financeiro_acesso" on public.contas_pagar;
create policy "financeiro_acesso" on public.contas_pagar
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro', 'aux_adm'));

drop policy if exists "financeiro_acesso" on public.contas_receber;
create policy "financeiro_acesso" on public.contas_receber
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro', 'aux_adm'));

drop policy if exists "contas_pagar_modelos_adm" on public.contas_pagar_modelos;
drop policy if exists "financeiro_acesso" on public.contas_pagar_modelos;
create policy "financeiro_acesso" on public.contas_pagar_modelos
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro', 'aux_adm'));

-- A antiga policy "contas_pagar_adm" (baseada na tabela perfis) some coberta
-- pela financeiro_acesso acima (que ja inclui 'adm'); remove a redundante.
drop policy if exists "contas_pagar_adm" on public.contas_pagar;
