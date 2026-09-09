-- g1 pediu que a Supervisora Raquel tenha acesso completo (ver e marcar
-- realizado/não realizado) à agenda pessoal de g1 — mesma tela "Agenda
-- Simone" que a Auxiliar Administrativa já usa, agora também em
-- /supervisora/agenda-simone.
drop policy if exists "pauta_acesso" on public.pauta_diretora;
create policy "pauta_acesso" on public.pauta_diretora
  for all using (public.meu_role() in ('adm', 'admin', 'gestao', 'aux_adm', 'supervisora'));
