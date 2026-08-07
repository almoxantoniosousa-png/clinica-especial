-- Substitui a ficha de cadastro física do primeiro contato: campos que só a
-- Simone sabe na hora da ligação (agendamento, plano de saúde, CID/médico),
-- que não fazem sentido pedir de novo pra família no link da Entrevista Inicial.
-- Executado via Supabase Management API (mesmo padrão das migrações anteriores deste projeto).

ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS agendamento_data date;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS agendamento_horario text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS cid text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS medico_nome text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS medico_crm text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS convenio_nome text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS convenio_titular text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS convenio_cpf text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS convenio_contato text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS convenio_setor text;
ALTER TABLE entrevistas_iniciais ADD COLUMN IF NOT EXISTS convenio_endereco text;
