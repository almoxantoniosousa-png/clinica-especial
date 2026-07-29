-- Marca quais ATs fazem material adaptado (hoje: Bianca, Raquel Santos e
-- Marivania) — em vez de travar por nome no código, o ADM controla isso
-- direto no cadastro do colaborador.
alter table atendentes add column if not exists faz_adaptado boolean not null default false;
