-- Campo livre pedido pela Solange, pra descrever algo na Interação Inicial
-- que não se encaixe nas opções fixas (Cumprimenta Pares, etc.)
alter table formularios_escolares add column if not exists interacao_obs text;
