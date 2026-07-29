-- Ponto 2 (conversa com as ATs): uma AT pode começar uma adaptação e outra
-- continuar depois — abre a permissão de UPDATE pra qualquer AT marcada
-- como "faz_adaptado", não só quem criou.
drop policy if exists materiais_adaptados_update on materiais_adaptados;

create policy materiais_adaptados_update on materiais_adaptados
  for update
  using (
    criado_por = auth.uid()
    or meu_role() = any (array['adm','admin','gestao','supervisora'])
    or exists (select 1 from atendentes a where a.id = auth.uid() and a.faz_adaptado = true)
  );

-- Ponto 8: Supervisora também pode excluir material adaptado (hoje só
-- ADM/Gestão podiam) — o que importa de guardar é o arquivo com a AT, não
-- o registro do sistema.
drop policy if exists materiais_adaptados_delete on materiais_adaptados;

create policy materiais_adaptados_delete on materiais_adaptados
  for delete
  using (
    criado_por = auth.uid()
    or meu_role() = any (array['adm','admin','gestao','supervisora'])
  );
