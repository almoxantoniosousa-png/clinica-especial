-- =============================================================================
-- FIX: impedia criar conversa com quem não está cadastrado em "perfis"
--
-- A tabela conversas tinha duas chaves estrangeiras (participante_a/b →
-- perfis.id) de uma época em que "perfis" era a única tabela de contas.
-- Hoje o chat já busca contas em três tabelas (perfis, atendentes, usuarios —
-- veja resolverPerfis() em app/(dashboard)/chat/page.tsx), mas essas FKs
-- continuavam só aceitando ids que existem em "perfis".
--
-- Resultado do bug: qualquer pessoa cadastrada apenas em "atendentes" ou
-- "usuarios" (ex: Fátima, aux_adm) tinha o INSERT em "conversas" recusado
-- com "violates foreign key constraint conversas_participante_a_fkey" — o
-- botão de nova conversa girava e nunca completava.
--
-- Rodar no SQL Editor do Supabase. É idempotente (if exists).
-- =============================================================================

alter table public.conversas drop constraint if exists conversas_participante_a_fkey;
alter table public.conversas drop constraint if exists conversas_participante_b_fkey;
