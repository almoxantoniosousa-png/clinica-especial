-- Permite registrar um atendimento na Clínica sem vincular a uma criança
-- específica do cadastro (ex: "Adaptado"/atendimento geral, ou texto livre
-- digitado pela AT). crianca_id continua obrigatório pra Casa/Escola.
alter table atendimentos add column if not exists crianca_texto text;
