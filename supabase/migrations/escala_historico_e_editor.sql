-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Rastreia quem cadastrou/editou cada atendimento da escala e arquiva
-- a versao anterior sempre que um atendimento e editado ou excluido.

ALTER TABLE public.escala
  ADD COLUMN IF NOT EXISTS criado_por_email text,
  ADD COLUMN IF NOT EXISTS criado_por_nome text,
  ADD COLUMN IF NOT EXISTS atualizado_por_email text,
  ADD COLUMN IF NOT EXISTS atualizado_por_nome text,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz;

CREATE TABLE IF NOT EXISTS public.escala_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL,
  acao text NOT NULL CHECK (acao IN ('edicao', 'exclusao')),
  dia text,
  horario text,
  crianca text,
  servico text,
  profissional_id uuid,
  profissional_nome text,
  local text,
  editado_por_email text NOT NULL,
  editado_por_nome text,
  editado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escala_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY escala_historico_select_staff ON public.escala_historico
  FOR SELECT
  USING (meu_role() = ANY (ARRAY['adm', 'admin', 'gestao', 'supervisora', 'financeiro']));

CREATE POLICY escala_historico_supervisora_insere ON public.escala_historico
  FOR INSERT
  WITH CHECK (meu_role() = 'supervisora');

-- Marcação de presença por atendimento: P (presença), F (falta), FJ (falta justificada)
ALTER TABLE public.escala
  ADD COLUMN IF NOT EXISTS presenca text CHECK (presenca IN ('P', 'F', 'FJ'));

ALTER TABLE public.escala_historico
  ADD COLUMN IF NOT EXISTS presenca text;

-- Motivo de mudança/ausência, visível pra Simone (gestão) e ADM via as policies de SELECT já existentes
ALTER TABLE public.escala
  ADD COLUMN IF NOT EXISTS motivo text;

ALTER TABLE public.escala_historico
  ADD COLUMN IF NOT EXISTS motivo text;
