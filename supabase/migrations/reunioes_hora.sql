-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Horario (opcional) da reuniao, junto com a data.

ALTER TABLE public.reunioes ADD COLUMN IF NOT EXISTS hora text;
