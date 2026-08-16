-- fotos_perfil_insert/update deixavam qualquer usuário autenticado
-- enviar foto pra pasta de QUALQUER outro colaborador. Restringido a:
-- a própria pasta (upload de perfil via Chat) OU ADM/Gestão/aux_adm
-- gerenciando a foto de outro colaborador (tela Colaboradores usa o
-- id do colaborador-alvo no caminho, não o do admin que faz upload).
drop policy if exists "fotos_perfil_insert" on storage.objects;
drop policy if exists "fotos_perfil_update" on storage.objects;

create policy "fotos_perfil_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'fotos-perfil'
    and (
      (auth.uid())::text = (storage.foldername(name))[1]
      or meu_role() = any (array['adm', 'admin', 'gestao', 'aux_adm'])
    )
  );

create policy "fotos_perfil_update"
  on storage.objects
  for update
  using (
    bucket_id = 'fotos-perfil'
    and (
      (auth.uid())::text = (storage.foldername(name))[1]
      or meu_role() = any (array['adm', 'admin', 'gestao', 'aux_adm'])
    )
  );

-- materiais_adaptados_storage_insert deixava qualquer usuário
-- autenticado (inclusive família) subir arquivo, sem checar cargo.
-- Esse bucket também é reaproveitado pelo Mural (foto do post), que
-- é acessível a praticamente todo cargo de equipe — por isso a regra
-- é "qualquer equipe", não uma lista fixa de papéis, só excluindo
-- família (mesmo padrão já usado em reuniao_anexos_insert).
drop policy if exists "materiais_adaptados_storage_insert" on storage.objects;

create policy "materiais_adaptados_storage_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'materiais-adaptados'
    and meu_role() <> 'familia'
    and meu_role() <> ''
  );
