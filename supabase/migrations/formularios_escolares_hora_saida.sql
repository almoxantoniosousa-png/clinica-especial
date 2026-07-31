-- ADM pediu: horário de saída no Comunicado Diário, pra cruzar com o
-- horário registrado em Novo Registro (conferência de horas).
alter table formularios_escolares add column if not exists hora_saida text;
