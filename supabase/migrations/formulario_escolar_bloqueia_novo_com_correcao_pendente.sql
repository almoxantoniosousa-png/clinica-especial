-- Impede a AT de criar um NOVO comunicado enquanto tiver algum com correção
-- pendente (correcao_solicitada = true) — a trava já existia só no
-- front-end (checagem ao carregar a página), e a simulação da Solange
-- mostrou que dava pra burlar (múltiplos registros novos criados em vez de
-- corrigir o pendente). Agora reforçada no banco, camada que não dá pra
-- pular. ADM/Gestão/Supervisora continuam livres pra inserir se precisarem.
drop policy if exists formulario_insert on formularios_escolares;

create policy formulario_insert on formularios_escolares
  for insert
  with check (
    meu_role() = any (array['adm','admin','gestao','supervisora'])
    or (
      meu_role() = any (array['atendente','at'])
      and not exists (
        select 1 from formularios_escolares existing
        where existing.at_id = at_id
          and existing.correcao_solicitada = true
      )
    )
  );
