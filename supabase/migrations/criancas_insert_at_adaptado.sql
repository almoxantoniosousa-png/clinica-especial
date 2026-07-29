-- Ponto 10 (conversa com as ATs): AT marcada como "faz_adaptado" pode
-- cadastrar uma criança nova direto na tela de Materiais Adaptados, se
-- ainda não estiver na lista — sem depender do ADM. Restrito a um cadastro
-- rápido (só o básico): campos sensíveis de saúde/documento continuam
-- bloqueados nesse caminho, só o ADM pode preenchê-los.
drop policy if exists inserir_criancas_para_adm on criancas;

create policy inserir_criancas_para_adm on criancas
  for insert
  with check (
    (exists (select 1 from atendentes where atendentes.id = auth.uid() and atendentes.role = 'adm'))
    or (
      exists (select 1 from atendentes a where a.id = auth.uid() and a.faz_adaptado = true)
      and diagnostico is null and cid is null and medicamentos is null and alergias is null
      and cpf is null and nome_mae is null and nome_pai is null and numero_processo is null
    )
  );
