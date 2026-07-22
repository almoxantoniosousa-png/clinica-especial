-- Permite a Supervisora pedir pra AT refazer/corrigir um Comunicado Diário,
-- independente de já ter enviado (ou não) esse mesmo comunicado para a família.
--
-- Contexto: a supervisora às vezes tem prazo apertado e prefere editar e
-- mandar pra família ela mesma, mas quer registrar uma correção pra AT
-- aprender/ajustar pros próximos dias. Enquanto a correção estiver pendente,
-- a AT fica travada de criar um novo comunicado até refazer esse.

alter table public.formularios_escolares
  add column correcao_solicitada boolean not null default false,
  add column correcao_texto text;
