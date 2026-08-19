-- Permite anexar um arquivo (PDF, imagem etc.) a um protocolo de conduta,
-- pra equipe baixar direto da tela em vez de só ler o texto.
alter table protocolos_conduta
  add column anexo_url text,
  add column anexo_nome text;

-- Bucket "protocolos-anexos" (público, criado via API) + políticas: qualquer
-- autenticado lê, só ADM sobe/apaga — mesmo padrão de quem gerencia protocolos_conduta.
create policy protocolos_anexos_storage_select on storage.objects
  for select using (bucket_id = 'protocolos-anexos');

create policy protocolos_anexos_storage_insert on storage.objects
  for insert with check (bucket_id = 'protocolos-anexos' and (meu_role() = 'adm' or meu_role() = 'admin'));

create policy protocolos_anexos_storage_delete on storage.objects
  for delete using (bucket_id = 'protocolos-anexos' and (meu_role() = 'adm' or meu_role() = 'admin'));
