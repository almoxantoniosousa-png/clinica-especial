-- ADM pediu pra liberar o cadastro de Colaboradores (Especialista/AT/
-- Supervisora/Apoio) também pra Auxiliar Administrativa.
drop policy atendentes_delete on atendentes;
create policy atendentes_delete on atendentes for delete
  using (meu_role() = any (array['adm','admin','aux_adm']));

drop policy atendentes_insert on atendentes;
create policy atendentes_insert on atendentes for insert
  with check (meu_role() = any (array['adm','admin','gestao','aux_adm']));

drop policy atendentes_select on atendentes;
create policy atendentes_select on atendentes for select
  using (meu_role() = any (array['adm','admin','gestao','supervisora','aux_adm']) or email = auth.email());

drop policy atendentes_update on atendentes;
create policy atendentes_update on atendentes for update
  using (meu_role() = any (array['adm','admin','gestao','aux_adm']) or email = auth.email());

drop policy colaboradoras_acesso on colaboradoras_internas;
create policy colaboradoras_acesso on colaboradoras_internas for all
  using (meu_role() = any (array['adm','admin','gestao','aux_adm']) or email = auth.email());

drop policy documentos_cadastro_insert on storage.objects;
create policy documentos_cadastro_insert on storage.objects for insert
  with check (bucket_id = 'documentos-cadastro' and meu_role() = any (array['adm','admin','gestao','aux_adm']));

drop policy documentos_cadastro_delete on storage.objects;
create policy documentos_cadastro_delete on storage.objects for delete
  using (bucket_id = 'documentos-cadastro' and meu_role() = any (array['adm','admin','gestao','aux_adm']));
