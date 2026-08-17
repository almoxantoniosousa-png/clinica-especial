-- mural_select_all e notificacoes_select liberavam SELECT pra qualquer
-- conta logada (auth.uid() IS NOT NULL), inclusive família. Achado pela
-- varredura diária da usuária. Confirmado: mural só é gerenciado por
-- adm/gestao/supervisora (INSERT/UPDATE/DELETE já restritos a esses
-- papéis, e o menu "Mural" só aparece pra papéis de equipe no
-- role-sidebar), e notificacoes nunca teve nenhuma linha com
-- destinatario_role='familia' — família nunca foi destinatária
-- pretendida de nenhuma das duas.
drop policy if exists "mural_select_all" on public.mural;
create policy "mural_select_all"
  on public.mural
  for select
  using (meu_role() <> 'familia' and meu_role() <> '');

drop policy if exists "notificacoes_select" on public.notificacoes;
create policy "notificacoes_select"
  on public.notificacoes
  for select
  using (meu_role() <> 'familia' and meu_role() <> '');
