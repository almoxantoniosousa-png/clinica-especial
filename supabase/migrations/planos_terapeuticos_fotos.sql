-- Registro fotográfico da reunião do Plano Terapêutico (pedido pela Solange:
-- as reuniões entre Especialistas, Supervisora e Simone terão fotos).

insert into storage.buckets (id, name, public) values ('planos-terapeuticos-fotos', 'planos-terapeuticos-fotos', true);

create policy planos_terapeuticos_fotos_select on storage.objects
  for select using (bucket_id = 'planos-terapeuticos-fotos');

create policy planos_terapeuticos_fotos_insert on storage.objects
  for insert with check (bucket_id = 'planos-terapeuticos-fotos' and meu_role() = any (array['gestao', 'supervisora']));

create policy planos_terapeuticos_fotos_delete on storage.objects
  for delete using (bucket_id = 'planos-terapeuticos-fotos' and meu_role() = any (array['gestao', 'supervisora']));

alter table public.planos_terapeuticos add column fotos text[] not null default '{}';
