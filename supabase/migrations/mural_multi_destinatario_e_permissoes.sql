-- Pedido: dar opção de marcar mais de um destinatário no Mural (ex: Especialista
-- e Atendente no mesmo post). Ao testar, apareceram dois bugs pré-existentes
-- que travavam gestão/supervisora de publicar (afetava qualquer uma delas
-- cujo cadastro vive só em "usuarios", sem linha espelhada em "atendentes"):
--
-- 1) RLS de INSERT/UPDATE/DELETE em "mural" só liberava role='adm' via
--    atendentes — gestão e supervisora nunca deveriam ter sido bloqueadas,
--    já que a própria tela já libera "+Novo Comunicado" pra essas duas roles.
-- 2) mural.autor_id tinha FK travada em atendentes(id) — impedia o insert
--    de quem só existe em usuarios. Removida; o nome do autor agora é
--    resolvido por função (abaixo) em vez de embed via FK do PostgREST.
--
-- Executado via Supabase Management API.

ALTER POLICY mural_insert_adm ON mural WITH CHECK (
  (auth.uid() IS NOT NULL) AND (
    EXISTS (SELECT 1 FROM atendentes a WHERE a.id = auth.uid() AND a.role::text IN ('adm','gestao','supervisora'))
    OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.role::text IN ('adm','gestao','supervisora'))
  )
);

ALTER POLICY mural_update_adm ON mural USING (
  (auth.uid() IS NOT NULL) AND (
    EXISTS (SELECT 1 FROM atendentes a WHERE a.id = auth.uid() AND a.role::text IN ('adm','gestao','supervisora'))
    OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.role::text IN ('adm','gestao','supervisora'))
  )
);

ALTER POLICY mural_delete_adm ON mural USING (
  (auth.uid() IS NOT NULL) AND (
    EXISTS (SELECT 1 FROM atendentes a WHERE a.id = auth.uid() AND a.role::text IN ('adm','gestao','supervisora'))
    OR EXISTS (SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.role::text IN ('adm','gestao','supervisora'))
  )
);

ALTER TABLE mural DROP CONSTRAINT mural_autor_id_fkey;

CREATE OR REPLACE FUNCTION public.mural_autores_por_ids(ids uuid[])
RETURNS TABLE(id uuid, nome text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, nome FROM atendentes WHERE id = ANY(ids)
  UNION ALL
  SELECT id, nome FROM usuarios WHERE id = ANY(ids);
$$;
GRANT EXECUTE ON FUNCTION public.mural_autores_por_ids(uuid[]) TO authenticated;
