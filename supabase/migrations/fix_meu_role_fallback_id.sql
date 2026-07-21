-- Ja aplicada em producao via mcp__supabase__apply_migration.
--
-- Bug de fundo (nao relacionado so a Escala): meu_role() so casava por
-- usuarios.auth_id = auth.uid(). Varias contas mais antigas (Carolina/
-- Supervisora, Simone/Gestao, adm@abraco.com, contas de teste de
-- atendente/especialista) tem auth_id NULL — o uid real de autenticacao
-- delas esta no proprio usuarios.id (padrao usado antes de auth_id existir).
-- Resultado: meu_role() retornava '' pra essas contas em QUALQUER policy
-- que dependa dela — falha silenciosa (sem erro na tela), so listas/campos
-- vazios. Foi assim que o campo "Profissional responsavel" da Escala
-- apareceu vazio pra Carolina (Supervisora) mesmo com atendentes cadastrados.
--
-- Corrige adicionando "or id = auth.uid()" como fallback.

create or replace function public.meu_role()
returns text
language sql
stable security definer
set search_path to 'public'
as $$
  select coalesce(
    (select role::text from public.usuarios where auth_id = auth.uid() or id = auth.uid() limit 1),
    (select role::text from public.atendentes where email = auth.email()),
    ''
  )
$$;
