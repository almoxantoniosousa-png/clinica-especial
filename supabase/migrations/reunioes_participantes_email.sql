-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Guarda o e-mail de cada participante (quando tem conta propria) lado a
-- lado com o nome, pra casar a confirmacao/assinatura com precisao em vez
-- de comparar so o texto do nome (que pode divergir do nome real da conta
-- se a pessoa foi adicionada como "nome avulso").

ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS participantes_emails text[] NOT NULL DEFAULT '{}';
