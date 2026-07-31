-- Dá à tabela "usuarios" os mesmos campos de cadastro que "atendentes" já
-- tem, pra Raquel Domingos e Carolina Borges (supervisoras que vivem aqui)
-- terem o mesmo formulário de edição completo que os demais colaboradores.
alter table usuarios add column if not exists cpf text;
alter table usuarios add column if not exists rg text;
alter table usuarios add column if not exists data_nascimento date;
alter table usuarios add column if not exists endereco text;
alter table usuarios add column if not exists cnpj text;
alter table usuarios add column if not exists razao_social text;
alter table usuarios add column if not exists data_demissao date;
alter table usuarios add column if not exists motivo_saida text;
alter table usuarios add column if not exists documentos jsonb;
alter table usuarios add column if not exists especialidade text;
alter table usuarios add column if not exists registro_profissional text;
