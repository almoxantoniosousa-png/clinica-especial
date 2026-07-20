-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Arquivo de ATAs de reuniao — visivel so pra quem participou (por role).

CREATE TABLE IF NOT EXISTS public.reunioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  data date NOT NULL,
  conteudo text NOT NULL,
  participantes text[] NOT NULL,
  criado_por_email text NOT NULL,
  criado_por_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reunioes_data_idx ON public.reunioes (data DESC);

ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

-- Só quem participou (role dentro do array) enxerga a ata.
CREATE POLICY reunioes_select_participante ON public.reunioes
  FOR SELECT
  USING (meu_role() = ANY (participantes));

-- Qualquer conta autenticada da equipe (não-família) pode registrar uma ata.
CREATE POLICY reunioes_insert_equipe ON public.reunioes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND meu_role() <> 'familia' AND meu_role() <> '');

-- Só quem criou pode editar/excluir a própria ata.
CREATE POLICY reunioes_update_autor ON public.reunioes
  FOR UPDATE
  USING (criado_por_email = auth.email())
  WITH CHECK (criado_por_email = auth.email());

CREATE POLICY reunioes_delete_autor ON public.reunioes
  FOR DELETE
  USING (criado_por_email = auth.email());
