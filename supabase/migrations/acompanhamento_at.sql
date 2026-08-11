-- =============================================================================
-- ACOMPANHAMENTO AT (escola/casa) — nova feature da AT + correção de bug
-- antigo que já afetava o Registro ABC da Supervisora
--
-- Contexto: prontuarios.autor_id tinha FK travada em usuarios(id), mas todos
-- os AT e supervisoras reais só existem na tabela atendentes (não em
-- usuarios). Ou seja, o Registro ABC (Supervisora) estava quebrado pra toda
-- supervisora real desde sempre — mesma classe de bug já corrigida em
-- mural_autor_id_fkey (ver rls_complementar.sql / mural.sql).
-- =============================================================================

-- 1) Solta a FK de prontuarios.autor_id — autor_id passa a guardar o id vindo
--    de usuarios OU de atendentes, dependendo de onde o autor realmente mora
--    (mesmo padrão adotado em mural.autor_id)
alter table public.prontuarios drop constraint if exists prontuarios_autor_id_fkey;

-- 2) prontuario_insert: adiciona o caso "acompanhamento_at" (AT registrando
--    observação escolar/domiciliar), que antes não existia — só supervisora
--    (relatorio_supervisora) e staff (demais tipos) podiam inserir
drop policy if exists "prontuario_insert" on public.prontuarios;
create policy "prontuario_insert" on public.prontuarios
  for insert with check (
    (tipo = 'relatorio_supervisora' and public.meu_role() = 'supervisora' and autor_id = public.meu_usuario_id())
    or (tipo = 'acompanhamento_at' and public.meu_role() = 'atendente' and autor_id = public.meu_usuario_id())
    or (tipo not in ('relatorio_supervisora', 'acompanhamento_at') and public.meu_role() in ('adm', 'admin', 'gestao', 'especialista'))
  );
