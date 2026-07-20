-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Reestrutura a ata pro modelo real usado na clinica (data/hora/proxima
-- reuniao, participantes nomeados, pontos anteriores/atencao, tabela de
-- plano de acao com causa/responsavel/prazo).

ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS data_proxima_reuniao date,
  ADD COLUMN IF NOT EXISTS participantes_nomes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pontos_anteriores text,
  ADD COLUMN IF NOT EXISTS itens_acao jsonb NOT NULL DEFAULT '[]';

ALTER TABLE public.reunioes RENAME COLUMN pauta TO pontos_atencao;
ALTER TABLE public.reunioes DROP COLUMN IF EXISTS decisoes;

-- Bucket privado pra anexos das atas (imagens ilustrativas, doc assinado
-- escaneado). Caminho dos arquivos: {reuniao_id}/{nome_do_arquivo}
INSERT INTO storage.buckets (id, name, public)
VALUES ('reuniao-anexos', 'reuniao-anexos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY reuniao_anexos_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reuniao-anexos'
    AND EXISTS (
      SELECT 1 FROM public.reunioes r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND meu_role() = ANY (r.participantes)
    )
  );

CREATE POLICY reuniao_anexos_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reuniao-anexos'
    AND auth.uid() IS NOT NULL
    AND meu_role() <> 'familia'
    AND meu_role() <> ''
  );

CREATE POLICY reuniao_anexos_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'reuniao-anexos'
    AND EXISTS (
      SELECT 1 FROM public.reunioes r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.criado_por_email = auth.email()
    )
  );
