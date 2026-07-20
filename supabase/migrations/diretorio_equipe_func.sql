-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Corrige bug real: RLS de usuarios/atendentes restringe cargos nao
-- privilegiados (atendente, especialista, aux_adm, financeiro) a ver
-- so a propria linha, entao o seletor de participantes da Reuniao
-- ficava vazio pra eles. Esta funcao SECURITY DEFINER expoe so
-- email/nome/cargo de toda a equipe ativa (nada sensivel), sem abrir
-- as tabelas completas.
CREATE OR REPLACE FUNCTION public.diretorio_equipe()
RETURNS TABLE(email text, nome text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email, u.nome, u.role::text
  FROM usuarios u
  WHERE u.role <> 'familia' AND u.ativo = true AND meu_role() <> 'familia'
  UNION ALL
  SELECT a.email, a.nome, a.role::text
  FROM atendentes a
  WHERE a.data_demissao IS NULL AND meu_role() <> 'familia';
$$;

GRANT EXECUTE ON FUNCTION public.diretorio_equipe() TO authenticated;
