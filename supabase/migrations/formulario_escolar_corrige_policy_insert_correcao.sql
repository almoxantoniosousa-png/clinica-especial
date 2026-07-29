-- A policy anterior (formulario_escolar_bloqueia_novo_com_correcao_pendente)
-- tinha um bug de escopo: "existing.at_id = at_id" — dentro da subquery
-- correlacionada, o "at_id" sem prefixo resolvia pro PRÓPRIO "existing"
-- (ambiguidade clássica de subquery correlacionada), virando
-- "existing.at_id = existing.at_id" (sempre verdadeiro) em vez de comparar
-- com o registro novo sendo inserido. Na prática, a trava ficava
-- global/incorreta em vez de por AT. Corrigido qualificando os dois lados
-- explicitamente.
drop policy if exists formulario_insert on formularios_escolares;

create policy formulario_insert on formularios_escolares
  for insert
  with check (
    meu_role() = any (array['adm','admin','gestao','supervisora'])
    or (
      meu_role() = any (array['atendente','at'])
      and not exists (
        select 1 from formularios_escolares existing
        where existing.at_id = formularios_escolares.at_id
          and existing.correcao_solicitada = true
      )
    )
  );
