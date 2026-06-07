-- =============================================================================
-- RLS POR ROLE — substituí políticas permissivas por restrições por papel
-- Rodar no SQL Editor do Supabase
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES (chamadas nas políticas, cached por transação)
-- ---------------------------------------------------------------------------

-- Retorna o role do usuário autenticado (busca em usuarios e atendentes)
create or replace function public.meu_role()
returns text language sql security definer stable as $$
  select coalesce(
    (select role::text from public.usuarios   where auth_id = auth.uid()),
    (select role::text from public.atendentes where email   = auth.email()),
    ''
  )
$$;

-- Retorna o id do atendente logado (para restringir aos próprios registros)
create or replace function public.meu_atendente_id()
returns uuid language sql security definer stable as $$
  select id from public.atendentes where email = auth.email()
$$;

-- Retorna a crianca_id vinculada ao responsável logado (portal da família)
create or replace function public.minha_crianca_id()
returns uuid language sql security definer stable as $$
  select crianca_id from public.responsaveis
  where email = auth.email() and ativo = true
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- TABELAS FINANCEIRAS — somente adm e financeiro
-- ---------------------------------------------------------------------------

drop policy if exists "acesso_autenticado" on public.contas_pagar;
drop policy if exists "financeiro_acesso"  on public.contas_pagar;
create policy "financeiro_acesso" on public.contas_pagar
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro'));

drop policy if exists "acesso_autenticado" on public.contas_receber;
drop policy if exists "financeiro_acesso"  on public.contas_receber;
create policy "financeiro_acesso" on public.contas_receber
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro'));

drop policy if exists "acesso_autenticado" on public.folha_pagamento;
drop policy if exists "financeiro_acesso"  on public.folha_pagamento;
create policy "financeiro_acesso" on public.folha_pagamento
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro', 'gestao'));

-- ---------------------------------------------------------------------------
-- PAUTA DA DIRETORA — adm, gestao, aux_adm
-- ---------------------------------------------------------------------------

drop policy if exists "acesso_autenticado" on public.pauta_diretora;
drop policy if exists "pauta_acesso"       on public.pauta_diretora;
create policy "pauta_acesso" on public.pauta_diretora
  for all using (public.meu_role() in ('adm', 'admin', 'gestao', 'aux_adm'));

-- ---------------------------------------------------------------------------
-- PRONTUÁRIOS — especialista lê/escreve os seus; adm/gestao/supervisora leem tudo
-- ---------------------------------------------------------------------------

drop policy if exists "acesso_autenticado" on public.prontuarios;
drop policy if exists "prontuario_select"  on public.prontuarios;
drop policy if exists "prontuario_insert"  on public.prontuarios;
drop policy if exists "prontuario_update"  on public.prontuarios;
drop policy if exists "prontuario_delete"  on public.prontuarios;

create policy "prontuario_select" on public.prontuarios
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
    or autor_id = public.meu_atendente_id()
  );

create policy "prontuario_insert" on public.prontuarios
  for insert with check (
    public.meu_role() in ('adm', 'admin', 'gestao', 'especialista')
  );

create policy "prontuario_update" on public.prontuarios
  for update using (
    public.meu_role() in ('adm', 'admin', 'gestao')
    or autor_id = public.meu_atendente_id()
  );

create policy "prontuario_delete" on public.prontuarios
  for delete using (public.meu_role() in ('adm', 'admin', 'gestao'));

-- ---------------------------------------------------------------------------
-- FORMULÁRIOS ESCOLARES — atendente escreve os seus; família lê só da sua criança
-- ---------------------------------------------------------------------------

drop policy if exists "acesso_autenticado"   on public.formularios_escolares;
drop policy if exists "formulario_select"    on public.formularios_escolares;
drop policy if exists "formulario_insert"    on public.formularios_escolares;
drop policy if exists "formulario_update"    on public.formularios_escolares;
drop policy if exists "formulario_delete"    on public.formularios_escolares;

create policy "formulario_select" on public.formularios_escolares
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'atendente', 'at')
    or crianca_id = public.minha_crianca_id()
  );

create policy "formulario_insert" on public.formularios_escolares
  for insert with check (
    public.meu_role() in ('atendente', 'at', 'adm', 'admin', 'gestao')
  );

create policy "formulario_update" on public.formularios_escolares
  for update using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
    or (
      public.meu_role() in ('atendente', 'at')
      and at_id = public.meu_atendente_id()
    )
  );

create policy "formulario_delete" on public.formularios_escolares
  for delete using (public.meu_role() in ('adm', 'admin', 'gestao'));

-- ---------------------------------------------------------------------------
-- USUÁRIOS — cada um vê só o próprio; adm e gestao veem todos
-- ---------------------------------------------------------------------------

drop policy if exists "acesso_autenticado" on public.usuarios;
drop policy if exists "usuarios_select"    on public.usuarios;
drop policy if exists "usuarios_insert"    on public.usuarios;
drop policy if exists "usuarios_update"    on public.usuarios;

create policy "usuarios_select" on public.usuarios
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao')
    or auth_id = auth.uid()
  );

create policy "usuarios_insert" on public.usuarios
  for insert with check (public.meu_role() in ('adm', 'admin'));

create policy "usuarios_update" on public.usuarios
  for update using (
    public.meu_role() in ('adm', 'admin')
    or auth_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- ATENDENTES — adm, gestao, supervisora veem todos; cada um vê o próprio
-- ---------------------------------------------------------------------------

drop policy if exists "acesso_autenticado" on public.atendentes;
drop policy if exists "atendentes_select"  on public.atendentes;
drop policy if exists "atendentes_update"  on public.atendentes;

create policy "atendentes_select" on public.atendentes
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
    or email = auth.email()
  );

create policy "atendentes_update" on public.atendentes
  for update using (
    public.meu_role() in ('adm', 'admin', 'gestao')
    or email = auth.email()
  );

create policy "atendentes_insert" on public.atendentes
  for insert with check (public.meu_role() in ('adm', 'admin', 'gestao'));

create policy "atendentes_delete" on public.atendentes
  for delete using (public.meu_role() in ('adm', 'admin'));

-- ---------------------------------------------------------------------------
-- DEMAIS TABELAS — mantidas abertas para autenticados (risco baixo)
-- criancas, atendimentos, agenda, escala, mural, notificacoes,
-- conversas, mensagens_chat: qualquer usuário logado pode acessar
-- (refinamento futuro conforme necessidade)
-- ---------------------------------------------------------------------------
