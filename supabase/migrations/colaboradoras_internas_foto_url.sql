-- Card de aniversário no Mural precisa de foto do aniversariante. Pra
-- atendentes/especialistas/supervisora/gestão/adm já existe `atendentes.
-- logo_url` (mesmo campo que o Chat usa como foto de perfil, apesar do
-- nome). Só "Apoio" (colaboradoras_internas) não tinha nenhum campo de foto.
alter table colaboradoras_internas add column if not exists foto_url text;
