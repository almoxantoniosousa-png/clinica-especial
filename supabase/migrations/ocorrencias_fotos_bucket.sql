-- Bucket de fotos anexadas às Ocorrências Diárias.

insert into storage.buckets (id, name, public) values ('ocorrencias-fotos', 'ocorrencias-fotos', true);

create policy ocorrencias_fotos_select on storage.objects
  for select using (bucket_id = 'ocorrencias-fotos');

create policy ocorrencias_fotos_insert on storage.objects
  for insert with check (
    bucket_id = 'ocorrencias-fotos'
    and meu_role() = any (array['adm', 'admin', 'aux_adm'])
  );

create policy ocorrencias_fotos_delete on storage.objects
  for delete using (
    bucket_id = 'ocorrencias-fotos'
    and meu_role() = any (array['adm', 'admin'])
  );
