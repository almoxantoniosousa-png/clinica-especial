alter table contas_receber
  add column if not exists desconto_glosa numeric(10, 2) default 0;
