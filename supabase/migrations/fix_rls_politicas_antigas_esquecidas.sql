-- Achado da varredura diária (2026-07-17): migrações antigas nunca removeram
-- as políticas amplas ("auth.uid() is not null") ao adicionar políticas mais
-- restritas por role — como o Postgres combina políticas permissivas com OR,
-- as antigas continuavam liberando acesso a qualquer autenticado, incluindo
-- contas de família, para dados clínicos/pessoais de QUALQUER criança.
--
-- Aplicado diretamente no banco em produção em 2026-07-17. Este arquivo
-- documenta a migração no repositório (o passo que ficou faltando na hora).

-- CRIANCAS: qualquer autenticado lia todas as crianças. Substitui por:
-- staff vê todas; família só vê a própria (vinculada em responsaveis).
drop policy if exists "criancas_todos_autenticados" on public.criancas;

create policy "criancas_select_staff" on public.criancas
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at', 'aux_adm', 'financeiro')
  );

create policy "criancas_select_familia" on public.criancas
  for select using (id = public.minha_crianca_id());

-- PRONTUARIOS: qualquer autenticado lia E inseria prontuários (dados clínicos
-- internos, família nunca deveria ver). As políticas corretas (prontuario_*)
-- já existem e continuam valendo — só removendo as antigas e amplas.
drop policy if exists "prontuarios_select" on public.prontuarios;
drop policy if exists "prontuarios_insert" on public.prontuarios;

-- FORMULARIOS_ESCOLARES (comunicado diário): qualquer autenticado lia tudo
-- (inclusive não revisado) e conseguia editar/inserir sem checar o role.
-- Consolida numa política de leitura correta: staff vê tudo; família só o
-- comunicado da própria criança E já enviado pela supervisora.
drop policy if exists "formularios_select_todos" on public.formularios_escolares;
drop policy if exists "formularios_familia_select" on public.formularios_escolares;
drop policy if exists "formulario_select" on public.formularios_escolares;
drop policy if exists "formularios_update_supervisora" on public.formularios_escolares;
drop policy if exists "formularios_insert_atendente" on public.formularios_escolares;

create policy "formulario_select_v2" on public.formularios_escolares
  for select using (
    (public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'atendente', 'at'))
    or (crianca_id = public.minha_crianca_id() and enviado_familia = true)
  );
-- formulario_update, formulario_insert e formulario_delete já estavam corretos — mantidos.

-- AGENDA: tabela sem nenhuma política restrita (tudo aberto pra qualquer
-- autenticado, incluindo família). Hoje sem dados, mas corrigindo antes de
-- ser usada.
drop policy if exists "agenda_all" on public.agenda;
drop policy if exists "agenda_especialista" on public.agenda;

create policy "agenda_staff" on public.agenda
  for all using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at', 'aux_adm', 'financeiro')
  )
  with check (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'especialista', 'atendente', 'at', 'aux_adm', 'financeiro')
  );
