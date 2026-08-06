-- Simone pediu pra separar o campo "Lanche" (hoje um texto livre + toggle
-- "Comeu tudo") em 3 grupos de seleção independentes: independência,
-- resultado com colegas, comportamento social durante o lanche. As
-- colunas antigas (lanche, comeu_tudo, comeu_tudo_obs) ficam no banco
-- por causa do histórico, só não são mais preenchidas pela tela.
alter table formularios_escolares add column if not exists lanche_independencia text[] default '{}';
alter table formularios_escolares add column if not exists lanche_resultado text[] default '{}';
alter table formularios_escolares add column if not exists lanche_comportamento text[] default '{}';
