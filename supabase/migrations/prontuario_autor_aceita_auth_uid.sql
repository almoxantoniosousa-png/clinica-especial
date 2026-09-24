-- prontuarios.autor_id tem FK pra auth.users, então as telas gravam o id do
-- login. A leitura/edição só aceitava o id da linha em atendentes
-- (meu_atendente_id), que é diferente pra quem teve a conta de login criada
-- depois do cadastro — a especialista salvava e não via o próprio prontuário.
drop policy if exists prontuario_select on public.prontuarios;
create policy prontuario_select on public.prontuarios for select using (
  ((tipo = 'relatorio_supervisora') and (meu_role() = any (array['gestao','supervisora'])))
  or ((tipo <> 'relatorio_supervisora') and (meu_role() = any (array['adm','admin','gestao','supervisora'])))
  or (autor_id = meu_atendente_id())
  or (autor_id = auth.uid())
);

drop policy if exists prontuario_update on public.prontuarios;
create policy prontuario_update on public.prontuarios for update using (
  ((tipo = 'relatorio_supervisora') and (meu_role() = 'gestao'))
  or ((tipo <> 'relatorio_supervisora') and ((meu_role() = any (array['adm','admin','gestao'])) or (autor_id = meu_atendente_id()) or (autor_id = auth.uid())))
);
