-- =============================================================================
-- ENTREVISTA INICIAL PRESENCIAL
--
-- Hoje a família responde um formulário remoto rápido (Sim/Não, múltipla
-- escolha) e depois a Gestão faz a entrevista presencial de verdade, onde
-- aprofunda cada ponto — mas isso não tinha nenhum apoio no sistema, ficava
-- só na cabeça da Simone ou em papel avulso. Esta migration adiciona os
-- campos que faltavam pra ela registrar esse aprofundamento (Histórico
-- Médico e Objetivos não tinham nenhum campo reservado) e um carimbo de
-- quando/quem registrou, pra mostrar um selo na lista.
-- =============================================================================

alter table public.entrevistas_iniciais
  add column if not exists diagnostico_detalhado text,
  add column if not exists terapias_anteriores_detalhe text,
  add column if not exists medicacao_detalhe text,
  add column if not exists desenvolvimento_detalhe text,
  add column if not exists prioridade_familia text,
  add column if not exists expectativas_tratamento text,
  add column if not exists entrevista_presencial_em timestamptz,
  add column if not exists entrevista_presencial_por text;
