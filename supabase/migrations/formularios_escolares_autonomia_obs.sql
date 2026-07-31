-- Campo livre pedido pela Solange, pra observações específicas do passo
-- Autonomia e Higiene que não se encaixem nos toggles fixos.
alter table formularios_escolares add column if not exists autonomia_obs text;
