-- Permite Supervisora registrar relatório (tipo 'relatorio_supervisora') na tabela
-- prontuarios já existente, e adiciona campo de feedback da Gestão nesses relatórios.
--
-- Contexto: esporadicamente a supervisora fica com uma criança, e a Gestão (Simone)
-- pediu que ela registre um relatório do que aconteceu, com direito a feedback.
--
-- Regras de acesso pra esse tipo específico ('relatorio_supervisora'):
--   - Supervisora cria e vê os próprios relatórios.
--   - Gestão vê e responde (feedback) qualquer relatório desse tipo.
--   - ADM NÃO participa desse fluxo (só continua com acesso aos outros tipos,
--     como os prontuários de Especialista, que não mudam de comportamento).

alter table public.prontuarios
  add column feedback_gestao text,
  add column feedback_por text,
  add column feedback_em timestamptz;

alter policy prontuario_select on public.prontuarios
  using (
    (tipo = 'relatorio_supervisora' and meu_role() = any (array['gestao', 'supervisora']))
    or (tipo <> 'relatorio_supervisora' and meu_role() = any (array['adm', 'admin', 'gestao', 'supervisora']))
    or (autor_id = meu_atendente_id())
  );

alter policy prontuario_insert on public.prontuarios
  with check (
    (tipo = 'relatorio_supervisora' and meu_role() = 'supervisora' and autor_id = meu_usuario_id())
    or (tipo <> 'relatorio_supervisora' and meu_role() = any (array['adm', 'admin', 'gestao', 'especialista']))
  );

alter policy prontuario_update on public.prontuarios
  using (
    (tipo = 'relatorio_supervisora' and meu_role() = 'gestao')
    or (tipo <> 'relatorio_supervisora' and (meu_role() = any (array['adm', 'admin', 'gestao']) or autor_id = meu_atendente_id()))
  );

alter policy prontuario_delete on public.prontuarios
  using (
    (tipo = 'relatorio_supervisora' and meu_role() = 'gestao')
    or (tipo <> 'relatorio_supervisora' and meu_role() = any (array['adm', 'admin', 'gestao']))
  );
