-- Simone (role gestao) passa a ter o mesmo acesso de gestão de protocolos
-- que a Solange (adm): criar, editar e excluir protocolo de qualquer
-- cargo, e não só confirmar a leitura do próprio. Pedido pela Solange.
drop policy if exists "protocolos_acesso" on public.protocolos_conduta;
create policy "protocolos_acesso" on public.protocolos_conduta
  for all using (public.meu_role() in ('adm', 'admin', 'gestao'));

drop policy if exists protocolos_anexos_storage_insert on storage.objects;
create policy protocolos_anexos_storage_insert on storage.objects
  for insert with check (bucket_id = 'protocolos-anexos' and (meu_role() in ('adm', 'admin', 'gestao')));

drop policy if exists protocolos_anexos_storage_delete on storage.objects;
create policy protocolos_anexos_storage_delete on storage.objects
  for delete using (bucket_id = 'protocolos-anexos' and (meu_role() in ('adm', 'admin', 'gestao')));
