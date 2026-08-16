-- "Allow public upload/update fotos-criancas" deixavam QUALQUER
-- pessoa — mesmo sem login, só usando a chave pública do projeto —
-- enviar ou substituir a foto de qualquer criança no sistema. A
-- leitura (select) continua pública de propósito (usada em telas como
-- o Mural); só a escrita precisa ficar restrita a quem cadastra
-- crianças (adm/gestão/supervisora/aux_adm).
drop policy if exists "Allow public upload fotos-criancas" on storage.objects;
drop policy if exists "Allow public update fotos-criancas" on storage.objects;

create policy "fotos_criancas_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'fotos-criancas'
    and meu_role() = any (array['adm', 'admin', 'gestao', 'supervisora', 'aux_adm'])
  );

create policy "fotos_criancas_update"
  on storage.objects
  for update
  using (
    bucket_id = 'fotos-criancas'
    and meu_role() = any (array['adm', 'admin', 'gestao', 'supervisora', 'aux_adm'])
  );
