-- Gestão e Financeiro não tinham nenhuma policy de SELECT em atendimentos —
-- só ADM e o próprio atendente (via atendente_id = auth.uid()) conseguiam
-- ler a tabela. Isso zerava todo o Analytics do dashboard da Gestão
-- (atendimentos do mês, receita, modalidades, top profissionais etc.).
create policy "gestao_financeiro_veem_atendimentos"
  on public.atendimentos
  for select
  using (meu_role() = any (array['gestao', 'financeiro']));
