-- Solange pediu campo de texto específico dentro de cada item (não um
-- genérico só): período menstrual, banheiro e evacuou passam a ter
-- observação própria, complementando a ação em vez de só dizer se
-- aconteceu ou não.
alter table formularios_escolares add column if not exists periodo_menstrual_obs text;
alter table formularios_escolares add column if not exists banheiro_obs text;
alter table formularios_escolares add column if not exists evacuou_obs text;
