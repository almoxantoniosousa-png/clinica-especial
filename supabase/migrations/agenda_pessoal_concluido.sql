-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Adiciona o status "concluido" (check de feito) na Agenda Pessoal do ADM.

ALTER TABLE public.agenda_pessoal
ADD COLUMN IF NOT EXISTS concluido boolean NOT NULL DEFAULT false;
