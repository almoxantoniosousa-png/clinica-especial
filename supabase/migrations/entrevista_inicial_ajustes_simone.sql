-- Ajustes pedidos pela Simone no formulário público (família) da Entrevista
-- Inicial: rótulos/placeholders mais objetivos, medicações vira texto livre
-- (deixa de ser lista estruturada), e alguns campos foram removidos por
-- serem redundantes ou porque ela prefere perguntar ao vivo na entrevista.
-- Executado via Supabase Management API.

ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS medicacoes_texto text;
