-- Mesmo padrão de bug encontrado em criancas/prontuarios/formularios_escolares
-- (ver fix_rls_politicas_antigas_esquecidas.sql): políticas antigas e amplas
-- nunca removidas ao lado de políticas corretas por participante, deixando
-- TODAS as conversas e mensagens do chat legíveis por qualquer usuário
-- autenticado (não só os participantes).
--
-- Aplicado diretamente no banco em produção em 2026-07-17. Este arquivo
-- documenta a migração no repositório.

drop policy if exists "acesso_autenticado" on public.conversas;
drop policy if exists "usuarios autenticados podem ver conversas" on public.conversas;

create policy "conversas_update" on public.conversas
  for update using (participante_a = auth.uid() or participante_b = auth.uid())
  with check (participante_a = auth.uid() or participante_b = auth.uid());

create policy "conversas_delete" on public.conversas
  for delete using (participante_a = auth.uid() or participante_b = auth.uid());

drop policy if exists "usuarios autenticados podem ver mensagens" on public.mensagens_chat;
