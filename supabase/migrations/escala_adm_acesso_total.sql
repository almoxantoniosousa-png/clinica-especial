-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- ADM passa a ter o mesmo acesso de edicao da supervisora na Escala
-- (criar, editar, excluir atendimentos, marcar presenca, registrar
-- motivo). As policies de escala/escala_historico/escala_snapshots
-- eram restritas a meu_role() = 'supervisora'; agora tambem aceitam
-- 'adm'/'admin'.

ALTER POLICY escala_supervisora_gerencia ON public.escala
  WITH CHECK (meu_role() = ANY (ARRAY['supervisora', 'adm', 'admin']));

ALTER POLICY escala_supervisora_update ON public.escala
  USING (meu_role() = ANY (ARRAY['supervisora', 'adm', 'admin']))
  WITH CHECK (meu_role() = ANY (ARRAY['supervisora', 'adm', 'admin']));

ALTER POLICY escala_supervisora_delete ON public.escala
  USING (meu_role() = ANY (ARRAY['supervisora', 'adm', 'admin']));

ALTER POLICY escala_historico_supervisora_insere ON public.escala_historico
  WITH CHECK (meu_role() = ANY (ARRAY['supervisora', 'adm', 'admin']));

ALTER POLICY escala_snapshots_supervisora_insere ON public.escala_snapshots
  WITH CHECK (meu_role() = ANY (ARRAY['supervisora', 'adm', 'admin']));
