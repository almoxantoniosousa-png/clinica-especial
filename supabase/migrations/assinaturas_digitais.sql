-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Assinatura de cada pessoa, cadastrada uma vez (desenhada na tela),
-- reaproveitada quando ela confirma uma ata especifica.

CREATE TABLE IF NOT EXISTS public.assinaturas (
  email text PRIMARY KEY,
  nome text,
  imagem_base64 text NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY assinaturas_dono ON public.assinaturas
  FOR ALL
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

-- Confirmacao + assinatura de um participante numa ata especifica —
-- so e gravada quando a propria pessoa, logada, confirma aquela ata.
CREATE TABLE IF NOT EXISTS public.reunioes_confirmacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id uuid NOT NULL REFERENCES public.reunioes(id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text,
  imagem_base64 text NOT NULL,
  confirmado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reuniao_id, email)
);

ALTER TABLE public.reunioes_confirmacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY reunioes_confirmacoes_select ON public.reunioes_confirmacoes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reunioes r
      WHERE r.id = reuniao_id AND meu_role() = ANY (r.participantes)
    )
  );

CREATE POLICY reunioes_confirmacoes_insert ON public.reunioes_confirmacoes
  FOR INSERT
  WITH CHECK (
    email = auth.email()
    AND EXISTS (
      SELECT 1 FROM public.reunioes r
      WHERE r.id = reuniao_id AND meu_role() = ANY (r.participantes)
    )
  );

CREATE POLICY reunioes_confirmacoes_delete ON public.reunioes_confirmacoes
  FOR DELETE
  USING (email = auth.email());
