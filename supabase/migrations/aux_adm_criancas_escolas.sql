-- =============================================================================
-- LIBERA AUX_ADM PRA CADASTRAR CRIANÇAS E ESCOLAS
--
-- Pedido do ADM: a Auxiliar Administrativa passa a acessar e cadastrar
-- crianças e escolas, junto com o ADM (ela já enxergava as duas listas via
-- SELECT, mas não conseguia inserir nem editar).
-- =============================================================================

-- criancas: inclui aux_adm no INSERT (mesmo acesso completo do ADM — cadastro
-- administrativo, não precisa da restrição de campos clínicos que existe pro
-- AT com faz_adaptado)
drop policy if exists "inserir_criancas_para_adm" on public.criancas;
create policy "inserir_criancas_para_adm" on public.criancas
  for insert with check (
    (public.meu_role() in ('adm', 'aux_adm'))
    or (public.meu_role() = 'gestao')
    or (
      (exists (select 1 from atendentes a where a.id = auth.uid() and a.faz_adaptado = true))
      and diagnostico is null and cid is null and medicamentos is null and alergias is null
      and cpf is null and nome_mae is null and nome_pai is null and numero_processo is null
    )
  );

-- criancas: inclui aux_adm no UPDATE (não mexe em DELETE — "cadastrar" não
-- inclui excluir, isso continua só com adm/admin)
drop policy if exists "criancas_update" on public.criancas;
create policy "criancas_update" on public.criancas
  for update using (
    public.meu_role() in ('adm', 'admin', 'aux_adm', 'gestao', 'supervisora', 'especialista')
  );

-- escolas: inclui aux_adm em inserir/editar/excluir (dado simples, sem
-- informação sensível, não precisa da mesma cautela de criancas)
drop policy if exists "escolas_gerenciar" on public.escolas;
create policy "escolas_gerenciar" on public.escolas
  for all using (
    public.meu_role() in ('adm', 'admin', 'aux_adm', 'gestao', 'supervisora')
  );
