-- =============================================================================
-- HABILITA RLS EM USUARIOS E ATENDENTES
-- Rodar no SQL Editor do Supabase
--
-- Essas duas tabelas estavam com RLS desabilitado: as políticas por role
-- criadas em rls_por_role.sql (usuarios_select/insert/update,
-- atendentes_select/insert/update/delete) existiam mas não tinham efeito.
-- Além disso, atendentes tinha políticas antigas e permissivas (qual = true,
-- cmd = ALL) que deixavam a tabela aberta para qualquer um. Removemos essas
-- políticas antigas e habilitamos o RLS nas duas tabelas.
-- =============================================================================

-- Remove políticas antigas/permissivas da tabela atendentes
drop policy if exists "Acesso leitura perfis"                 on public.atendentes;
drop policy if exists "Admins podem ler todos os perfis"      on public.atendentes;
drop policy if exists "Permitir tudo para perfis"             on public.atendentes;
drop policy if exists "Permitir update para administradores"  on public.atendentes;
drop policy if exists "Usuários podem ler o próprio perfil"   on public.atendentes;
drop policy if exists "atendente_le_proprio_perfil"           on public.atendentes;

-- Habilita RLS
alter table public.usuarios   enable row level security;
alter table public.atendentes enable row level security;
