-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Separa a ata em dois campos: pauta (o que sera discutido) e
-- decisoes (o que ficou decidido/encaminhado). Antes era um so
-- campo "conteudo".

ALTER TABLE public.reunioes RENAME COLUMN conteudo TO decisoes;
ALTER TABLE public.reunioes ALTER COLUMN decisoes DROP NOT NULL;
ALTER TABLE public.reunioes ADD COLUMN IF NOT EXISTS pauta text;
