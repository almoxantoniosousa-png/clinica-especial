-- ADM pediu pra AT também poder excluir o próprio "Novo Registro" (não só
-- editar) enquanto ainda está pendente. financeiro.atendimento_id já tem
-- ON DELETE CASCADE, então excluir o atendimento remove o lançamento
-- correspondente no Financeiro automaticamente, sem precisar de trigger.
create policy "atendente_exclui_proprio_atendimento_pendente"
  on public.atendimentos
  for delete
  using (atendente_id = auth.uid() and status = 'pendente');
