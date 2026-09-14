-- Pedido da gestão: Simone (role gestao) precisa criar protocolo de conduta
-- do mesmo jeito que a Solange (role adm) já cria. Antes só adm/admin
-- tinham acesso a essa tabela e ao bucket de anexo.
drop policy if exists "protocolos_acesso" on public.protocolos_conduta;
create policy "protocolos_acesso" on public.protocolos_conduta
  for all using (public.meu_role() in ('adm', 'admin', 'gestao'));

drop policy if exists protocolos_anexos_storage_insert on storage.objects;
create policy protocolos_anexos_storage_insert on storage.objects
  for insert with check (bucket_id = 'protocolos-anexos' and meu_role() in ('adm', 'admin', 'gestao'));

drop policy if exists protocolos_anexos_storage_delete on storage.objects;
create policy protocolos_anexos_storage_delete on storage.objects
  for delete using (bucket_id = 'protocolos-anexos' and meu_role() in ('adm', 'admin', 'gestao'));
