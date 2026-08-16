-- Mesmo padrão dos outros: select liberado pra "public" sem checar
-- cargo. ocorrencias-fotos confirmado listável anonimamente (fotos
-- reais de ocorrências com criança envolvida). planos-terapeuticos-
-- fotos ainda estava vazio, mas tinha a mesma brecha — corrigido
-- antes de acumular arquivo. Restrito ao mesmo papel já usado no
-- insert/delete de cada bucket.
-- Só quem faz upload é restrito a adm/aux_adm/supervisora, mas ler a
-- Ocorrência Diária (e as fotos anexadas) é usado por mais cargos —
-- por isso select é "qualquer equipe", não a mesma lista do insert.
drop policy if exists "ocorrencias_fotos_select" on storage.objects;
create policy "ocorrencias_fotos_select"
  on storage.objects
  for select
  using (
    bucket_id = 'ocorrencias-fotos'
    and meu_role() <> 'familia'
    and meu_role() <> ''
  );

-- Mesmo raciocínio: ver o Plano Terapêutico (e fotos anexadas) é
-- usado por mais cargos do que só quem edita o plano.
drop policy if exists "planos_terapeuticos_fotos_select" on storage.objects;
create policy "planos_terapeuticos_fotos_select"
  on storage.objects
  for select
  using (
    bucket_id = 'planos-terapeuticos-fotos'
    and meu_role() <> 'familia'
    and meu_role() <> ''
  );
