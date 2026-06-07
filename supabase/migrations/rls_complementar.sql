-- =============================================================================
-- RLS COMPLEMENTAR — corrige os achados do Supabase Security Advisor
-- Rodar no SQL Editor do Supabase (pode rodar tudo de uma vez, é idempotente)
--
-- Cobre:
--  1) função auxiliar nova: meu_usuario_id()
--  2) fixa search_path nas funções (alerta "function_search_path_mutable")
--  3) torna as funções de trigger do financeiro SECURITY DEFINER
--     (corrige o mesmo alerta de search_path E permite remover a política
--     "inserir_financeiro_via_trigger" que liberava insert pra qualquer um)
--  4) habilita RLS nas 11 tabelas que estavam com RLS desligado (nível ERROR)
--  5) cria políticas pras tabelas acima que ainda não tinham nenhuma
--  6) corrige políticas liberadas demais (USING true / WITH CHECK true)
--  7) cria políticas pras tabelas que tinham RLS ligado mas nenhuma política
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1) FUNÇÃO AUXILIAR — id do usuário logado na tabela usuarios (perfil)
--    (autor_id, usuario_id, participante_a/b etc. guardam usuarios.id, não auth.uid())
-- ---------------------------------------------------------------------------

create or replace function public.meu_usuario_id()
returns uuid language sql security definer stable
set search_path = public
as $$
  select id from public.usuarios where auth_id = auth.uid()
$$;


-- ---------------------------------------------------------------------------
-- 2) FIXA search_path NAS FUNÇÕES AUXILIARES JÁ EXISTENTES
--    (mesmo corpo de rls_por_role.sql, só adiciona "set search_path = public")
-- ---------------------------------------------------------------------------

create or replace function public.meu_role()
returns text language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select role::text from public.usuarios   where auth_id = auth.uid()),
    (select role::text from public.atendentes where email   = auth.email()),
    ''
  )
$$;

create or replace function public.meu_atendente_id()
returns uuid language sql security definer stable
set search_path = public
as $$
  select id from public.atendentes where email = auth.email()
$$;

create or replace function public.minha_crianca_id()
returns uuid language sql security definer stable
set search_path = public
as $$
  select crianca_id from public.responsaveis
  where email = auth.email() and ativo = true
  limit 1
$$;


-- ---------------------------------------------------------------------------
-- 3) FUNÇÕES DE TRIGGER DO FINANCEIRO — viram SECURITY DEFINER + search_path fixo
--    Hoje elas rodam com o privilégio de quem disparou o trigger (quem criou o
--    atendimento), por isso existia uma política "WITH CHECK (true)" liberando
--    insert geral em financeiro. Com SECURITY DEFINER elas passam a rodar com
--    o privilégio de quem É DONO da função (bypassa RLS), então dá pra remover
--    aquela política aberta com segurança — ver seção 6.
-- ---------------------------------------------------------------------------

create or replace function public.inserir_financeiro()
returns trigger language plpgsql
security definer
set search_path = public
as $$
begin
  insert into financeiro (
    atendimento_id, atendente_id, data, local, horas, valor, valor_total, status
  )
  values (
    new.id, new.atendente_id, new.data, new.local,
    coalesce(new.horas, 0), coalesce(new.valor_hora, 0), coalesce(new.valor_total, 0),
    'pendente'
  );
  return new;
end;
$$;

create or replace function public.inserir_financeiro_automatico()
returns trigger language plpgsql
security definer
set search_path = public
as $$
begin
  insert into financeiro (
    atendimento_id, atendente_id, data, local, valor, status
  )
  values (
    new.id, new.atendente_id, new.data, new.local, 100.00, 'pendente'
  );
  return new;
end;
$$;

create or replace function public.atualizar_status_atendimento()
returns trigger language plpgsql
security definer
set search_path = public
as $$
begin
  update public.atendimentos
  set status = new.status::status_atendimento
  where id = new.atendimento_id;
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 4) HABILITA RLS NAS TABELAS QUE ESTAVAM SEM PROTEÇÃO (nível ERROR)
-- ---------------------------------------------------------------------------

alter table public.conversa_participantes enable row level security;
alter table public.folha_pagamento        enable row level security;
alter table public.escolas                enable row level security;
alter table public.colaboradoras_internas enable row level security;
alter table public.portal_evolucao        enable row level security;
alter table public.portal_comunicados     enable row level security;
alter table public.horarios_escala        enable row level security;
alter table public.responsaveis           enable row level security;
alter table public.portal_momentos        enable row level security;
alter table public.log_auditoria          enable row level security;
alter table public.tipos_atendimento      enable row level security;
-- folha_pagamento já tinha a política "financeiro_acesso" — só faltava ligar o RLS


-- ---------------------------------------------------------------------------
-- 5) POLÍTICAS PARA AS TABELAS ACIMA (nenhuma delas tinha política ainda,
--    exceto folha_pagamento que já está coberta por "financeiro_acesso")
-- ---------------------------------------------------------------------------

-- Participantes de conversas em grupo: vejo as minhas; staff vê todas
drop policy if exists "conversa_participantes_acesso" on public.conversa_participantes;
create policy "conversa_participantes_acesso" on public.conversa_participantes
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
    or usuario_id = public.meu_usuario_id()
  );

-- Escolas: dado de referência — todo autenticado lê; só staff gerencia
drop policy if exists "escolas_select"     on public.escolas;
drop policy if exists "escolas_gerenciar"  on public.escolas;
create policy "escolas_select" on public.escolas
  for select using (auth.uid() is not null);
create policy "escolas_gerenciar" on public.escolas
  for all using (public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora'));

-- Colaboradoras internas: dado pessoal sensível (cpf, rg, endereço) — só staff e a própria
drop policy if exists "colaboradoras_acesso" on public.colaboradoras_internas;
create policy "colaboradoras_acesso" on public.colaboradoras_internas
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao')
    or email = auth.email()
  );

-- Portal da família (evolução / comunicados / momentos): família vê só da sua
-- criança; equipe (staff/especialista/atendente) lê e publica
drop policy if exists "portal_evolucao_select"     on public.portal_evolucao;
drop policy if exists "portal_evolucao_gerenciar"  on public.portal_evolucao;
create policy "portal_evolucao_select" on public.portal_evolucao
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at')
    or crianca_id = public.minha_crianca_id()
  );
create policy "portal_evolucao_gerenciar" on public.portal_evolucao
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at')
  );

drop policy if exists "portal_comunicados_select"    on public.portal_comunicados;
drop policy if exists "portal_comunicados_gerenciar" on public.portal_comunicados;
create policy "portal_comunicados_select" on public.portal_comunicados
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at')
    or crianca_id = public.minha_crianca_id()
  );
create policy "portal_comunicados_gerenciar" on public.portal_comunicados
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at')
  );

drop policy if exists "portal_momentos_select"    on public.portal_momentos;
drop policy if exists "portal_momentos_gerenciar" on public.portal_momentos;
create policy "portal_momentos_select" on public.portal_momentos
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at')
    or crianca_id = public.minha_crianca_id()
  );
create policy "portal_momentos_gerenciar" on public.portal_momentos
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at')
  );

-- Horários da escala: dado de referência — todo autenticado lê; só staff gerencia
drop policy if exists "horarios_escala_select"    on public.horarios_escala;
drop policy if exists "horarios_escala_gerenciar" on public.horarios_escala;
create policy "horarios_escala_select" on public.horarios_escala
  for select using (auth.uid() is not null);
create policy "horarios_escala_gerenciar" on public.horarios_escala
  for all using (public.meu_role() in ('adm', 'admin', 'gestao'));

-- Responsáveis: dado pessoal sensível da família — staff e o próprio responsável
drop policy if exists "responsaveis_select"    on public.responsaveis;
drop policy if exists "responsaveis_gerenciar" on public.responsaveis;
create policy "responsaveis_select" on public.responsaveis
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
    or email = auth.email()
  );
create policy "responsaveis_gerenciar" on public.responsaveis
  for all using (public.meu_role() in ('adm', 'admin', 'gestao'));

-- Log de auditoria: só staff lê; qualquer autenticado pode gravar (é o app
-- registrando as próprias ações via registrarLog)
drop policy if exists "log_auditoria_select" on public.log_auditoria;
drop policy if exists "log_auditoria_insert" on public.log_auditoria;
create policy "log_auditoria_select" on public.log_auditoria
  for select using (public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora'));
create policy "log_auditoria_insert" on public.log_auditoria
  for insert with check (auth.uid() is not null);

-- Tipos de atendimento: dado de referência — todo autenticado lê; só staff gerencia
drop policy if exists "tipos_atendimento_select"    on public.tipos_atendimento;
drop policy if exists "tipos_atendimento_gerenciar" on public.tipos_atendimento;
create policy "tipos_atendimento_select" on public.tipos_atendimento
  for select using (auth.uid() is not null);
create policy "tipos_atendimento_gerenciar" on public.tipos_atendimento
  for all using (public.meu_role() in ('adm', 'admin', 'gestao'));


-- ---------------------------------------------------------------------------
-- 6) CORRIGE POLÍTICAS LIBERADAS DEMAIS (USING true / WITH CHECK true)
-- ---------------------------------------------------------------------------

-- contas_pagar / contas_receber: já existe "financeiro_acesso" restrita
-- (criada em rls_por_role.sql) — só falta remover a antiga "allow all"
drop policy if exists "allow all" on public.contas_pagar;
drop policy if exists "allow all" on public.contas_receber;

-- crianças: substitui "qualquer autenticado pode editar/excluir" por papéis
drop policy if exists "Permitir atualização para usuários autenticados" on public.criancas;
drop policy if exists "Permitir exclusão para usuários autenticados"    on public.criancas;
drop policy if exists "criancas_update" on public.criancas;
drop policy if exists "criancas_delete" on public.criancas;
create policy "criancas_update" on public.criancas
  for update using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista')
  );
create policy "criancas_delete" on public.criancas
  for delete using (public.meu_role() in ('adm', 'admin'));

-- financeiro: remove o "with check (true)" do trigger — agora seguro porque as
-- funções de trigger viraram SECURITY DEFINER (seção 3) e não passam mais pela
-- RLS de quem disparou o trigger; inserts diretos ficam restritos ao staff
drop policy if exists "inserir_financeiro_via_trigger" on public.financeiro;
drop policy if exists "financeiro_insert" on public.financeiro;
create policy "financeiro_insert" on public.financeiro
  for insert with check (
    public.meu_role() in ('adm', 'admin', 'gestao', 'financeiro', 'supervisora')
  );

-- mensagens_chat: cada um só envia mensagem em nome de si mesmo
drop policy if exists "usuarios autenticados podem enviar mensagens" on public.mensagens_chat;
drop policy if exists "mensagens_chat_insert" on public.mensagens_chat;
create policy "mensagens_chat_insert" on public.mensagens_chat
  for insert with check (autor_id = public.meu_usuario_id());


-- ---------------------------------------------------------------------------
-- 7) TABELAS QUE TINHAM RLS LIGADO MAS NENHUMA POLÍTICA (bloqueavam todo mundo)
-- ---------------------------------------------------------------------------

-- Convênios: dado financeiro/clínico da criança — staff gerencia; família lê o seu
drop policy if exists "convenios_staff"          on public.convenios;
drop policy if exists "convenios_familia_select" on public.convenios;
create policy "convenios_staff" on public.convenios
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'financeiro', 'supervisora')
  );
create policy "convenios_familia_select" on public.convenios
  for select using (crianca_id = public.minha_crianca_id());

-- Equipe da criança: staff gerencia; cada profissional vê suas próprias atribuições
drop policy if exists "equipe_crianca_staff"          on public.equipe_crianca;
drop policy if exists "equipe_crianca_membro_select"  on public.equipe_crianca;
create policy "equipe_crianca_staff" on public.equipe_crianca
  for all using (public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora'));
create policy "equipe_crianca_membro_select" on public.equipe_crianca
  for select using (usuario_id = public.meu_usuario_id());

-- Eventos/agenda geral: todo autenticado lê; staff e o autor gerenciam
drop policy if exists "eventos_staff"               on public.eventos;
drop policy if exists "eventos_select_autenticado"  on public.eventos;
create policy "eventos_staff" on public.eventos
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
    or criado_por = public.meu_usuario_id()
  );
create policy "eventos_select_autenticado" on public.eventos
  for select using (auth.uid() is not null);

-- Famílias (vínculo usuário-criança): staff gerencia; cada um vê o próprio vínculo
drop policy if exists "familias_staff"           on public.familias;
drop policy if exists "familias_propria_select"  on public.familias;
create policy "familias_staff" on public.familias
  for all using (public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora'));
create policy "familias_propria_select" on public.familias
  for select using (usuario_id = public.meu_usuario_id());

-- Liminares: dado jurídico/financeiro sensível — só staff
drop policy if exists "liminares_staff" on public.liminares;
create policy "liminares_staff" on public.liminares
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'financeiro', 'supervisora')
  );

-- Regras do chat: configuração — todo autenticado lê (o app usa pra checar
-- permissão de conversa); só adm gerencia
drop policy if exists "regras_chat_select"     on public.regras_chat;
drop policy if exists "regras_chat_gerenciar"  on public.regras_chat;
create policy "regras_chat_select" on public.regras_chat
  for select using (auth.uid() is not null);
create policy "regras_chat_gerenciar" on public.regras_chat
  for all using (public.meu_role() in ('adm', 'admin'));
