-- Permite a ADM corrigir so o preco (valor_unitario) de um lancamento errado,
-- sem poder mexer em quantidade/tipo -- a tela so envia esse campo no update,
-- mas a policy em si autoriza a linha toda (mesmo padrao ja usado noutras
-- tabelas do sistema).
drop policy if exists "materiais_limpeza_mov_update" on public.materiais_limpeza_movimentacoes;
create policy "materiais_limpeza_mov_update" on public.materiais_limpeza_movimentacoes
  for update using (meu_role() in ('adm', 'admin'))
  with check (meu_role() in ('adm', 'admin'));
