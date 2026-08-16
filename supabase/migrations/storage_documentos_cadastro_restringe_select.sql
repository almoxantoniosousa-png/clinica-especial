-- documentos_cadastro_select estava aberto pra "public" sem checar
-- cargo nenhum — RG, CPF e documentos de cadastro de crianças e
-- colaboradores dava pra listar e baixar sem login (confirmado: list
-- anônimo retornava todas as pastas). Insert/delete desse bucket já
-- eram restritos a adm/admin/gestao/aux_adm; select agora segue o
-- mesmo padrão.
drop policy if exists "documentos_cadastro_select" on storage.objects;

create policy "documentos_cadastro_select"
  on storage.objects
  for select
  using (
    bucket_id = 'documentos-cadastro'
    and meu_role() = any (array['adm', 'admin', 'gestao', 'aux_adm'])
  );
