-- Campo livre pedido pela Solange, complementando o toggle "Comeu tudo"
-- (ex: comeu só metade, recusou algo específico, etc.)
alter table formularios_escolares add column if not exists comeu_tudo_obs text;
