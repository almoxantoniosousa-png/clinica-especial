-- Adiciona dois campos ao Comunicado Diário (formularios_escolares), pedidos
-- pela supervisora após comparar com outro formulário de acompanhamento em
-- uso: quanto de água a criança bebeu, e eventos escolares do dia.

alter table public.formularios_escolares
  add column agua_ingestao text,
  add column eventos_escolares text;
