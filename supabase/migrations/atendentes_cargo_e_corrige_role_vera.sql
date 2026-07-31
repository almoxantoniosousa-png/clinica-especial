-- Campo "Cargo/Função" livre para todos os colaboradores (especialista,
-- atendente, supervisora), separado da especialidade clínica.
alter table atendentes add column if not exists cargo text;

-- Vera Lúcia estava cadastrada como "atendente", mas é supervisora — por
-- isso não tinha as funcionalidades de supervisora (menu, permissões).
update atendentes set role = 'supervisora' where id = 'f2f0fba1-06e8-4076-8533-0b20acc28e20';
