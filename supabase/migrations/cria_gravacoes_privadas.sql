-- Feature "Record": gravação de reunião/situação via câmera do notebook,
-- restrita a ADM e Gestão. Guarda metadados; o arquivo em si vai pro
-- storage privado "gravacoes-privadas".
create table if not exists gravacoes (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  autor_email text not null,
  autor_nome text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table gravacoes enable row level security;

create policy gravacoes_select on gravacoes for select
  using (meu_role() = any (array['adm','admin','gestao']));

create policy gravacoes_insert on gravacoes for insert
  with check (meu_role() = any (array['adm','admin','gestao']));

create policy gravacoes_delete on gravacoes for delete
  using (meu_role() = any (array['adm','admin','gestao']));

insert into storage.buckets (id, name, public)
values ('gravacoes-privadas', 'gravacoes-privadas', false)
on conflict (id) do nothing;

create policy gravacoes_storage_select on storage.objects for select
  using (bucket_id = 'gravacoes-privadas' and meu_role() = any (array['adm','admin','gestao']));

create policy gravacoes_storage_insert on storage.objects for insert
  with check (bucket_id = 'gravacoes-privadas' and meu_role() = any (array['adm','admin','gestao']));

create policy gravacoes_storage_delete on storage.objects for delete
  using (bucket_id = 'gravacoes-privadas' and meu_role() = any (array['adm','admin','gestao']));
