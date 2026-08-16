-- "acesso_autenticado" era uma policy ALL usando só auth.uid() IS NOT
-- NULL — qualquer usuário logado podia alterar ou apagar o perfil de
-- QUALQUER outra pessoa (não só o próprio). Já existem policies
-- específicas de select (todo autenticado lê) e insert (só o próprio
-- id); substituindo por update/delete restritos ao próprio registro,
-- no mesmo padrão do insert.
drop policy if exists "acesso_autenticado" on public.perfis;

create policy "perfis_update"
  on public.perfis
  for update
  using (id = auth.uid());

create policy "perfis_delete"
  on public.perfis
  for delete
  using (id = auth.uid());
