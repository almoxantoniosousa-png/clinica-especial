-- Bucket de fotos anexadas ao Prontuario de Atendimento (Especialista) --
-- ate 2 fotos da crianca em atividade, pedido da Simone (Gestao) no piloto
-- de testes do app com as Especialistas.
insert into storage.buckets (id, name, public) values ('prontuarios-fotos', 'prontuarios-fotos', true)
on conflict (id) do nothing;

create policy prontuarios_fotos_select on storage.objects
  for select using (bucket_id = 'prontuarios-fotos');

create policy prontuarios_fotos_insert on storage.objects
  for insert with check (
    bucket_id = 'prontuarios-fotos'
    and public.meu_role() = any (array['especialista', 'supervisora', 'gestao', 'adm', 'admin'])
  );

create policy prontuarios_fotos_delete on storage.objects
  for delete using (
    bucket_id = 'prontuarios-fotos'
    and public.meu_role() = any (array['adm', 'admin'])
  );
