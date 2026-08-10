-- Segunda leva de ajustes pedidos pela Simone: formulário público (família)
-- vira quase todo "de marcar" (Sim/Não ou múltipla escolha) em vez de texto
-- livre — ela quer algo rápido e objetivo pros pais responderem, e explora
-- cada item com calma na entrevista presencial.
-- Novas colunas de apoio (a resposta em si continua nas colunas antigas,
-- como diagnostico/gestacao/parto/etc., agora guardando sim/não ou a opção
-- marcada em vez de texto livre).
-- Executado via Supabase Management API.

ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS tem_diagnostico text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS gestacao_intercorrencia text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS terapias_anteriores_melhora text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS tem_medicacao text;
