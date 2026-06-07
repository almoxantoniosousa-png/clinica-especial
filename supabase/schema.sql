-- =============================================================================
-- SCHEMA REAL — Clínica Abraço ABA
-- Gerado em 2026-06-05 a partir de information_schema.columns
-- Este arquivo documenta o banco real no Supabase.
-- NÃO é o schema original — reflete o estado atual do banco.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

-- Roles de usuário (tabela usuarios)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role_v2') then
    create type user_role_v2 as enum (
      'adm', 'admin', 'gestao', 'supervisora',
      'especialista', 'at', 'atendente', 'familia', 'financeiro'
    );
  end if;
end $$;

-- Roles dos atendentes/especialistas
do $$ begin
  if not exists (select 1 from pg_type where typname = 'atendente_role') then
    create type atendente_role as enum ('at', 'atendente', 'especialista');
  end if;
end $$;

-- Local de atendimento
do $$ begin
  if not exists (select 1 from pg_type where typname = 'local_atendimento') then
    create type local_atendimento as enum ('casa', 'escola', 'clinica');
  end if;
end $$;

-- Modalidade de atendimento
do $$ begin
  if not exists (select 1 from pg_type where typname = 'modalidade_atendimento') then
    create type modalidade_atendimento as enum ('liminar', 'convenio', 'particular');
  end if;
end $$;

-- Status geral (usado em agenda, liminares, convenios, etc.)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'status_geral') then
    create type status_geral as enum ('ativo', 'inativo', 'pendente', 'cancelado', 'agendado');
  end if;
end $$;

-- Status de atendimento
do $$ begin
  if not exists (select 1 from pg_type where typname = 'status_atendimento') then
    create type status_atendimento as enum ('pendente', 'aprovado', 'pago');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- USUÁRIOS E PERFIS
-- Atenção: o sistema tem 3 tabelas de usuário por razões históricas.
-- A tabela principal é `usuarios`. `atendentes` guarda ATs e especialistas.
-- `perfis` é legada (mantida por compatibilidade com queries antigas).
-- ---------------------------------------------------------------------------

-- Usuários gerais (gestão, supervisora, família, adm, financeiro)
create table if not exists public.usuarios (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null unique,
  telefone    text,
  foto_url    text,
  role        user_role_v2 not null,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Atendentes terapêuticos e especialistas
create table if not exists public.atendentes (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null unique,
  nome                  text not null,
  role                  atendente_role not null,
  logo_url              text,
  whatsapp              text,
  especialidade         text,
  conselho              text,
  pix_key               text,
  registro_profissional text,
  cpf                   text,
  rg                    text,
  data_nascimento       date,
  endereco              text,
  usuario_id            uuid references public.usuarios(id),
  created_at            timestamptz not null default now()
);

-- Legado: perfis (manter para não quebrar queries existentes)
create table if not exists public.perfis (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  nome       text not null,
  role       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CRIANÇAS E ESCOLA
-- ---------------------------------------------------------------------------

create table if not exists public.escolas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  endereco    text,
  coordenacao text,
  telefone    text,
  created_at  timestamptz
);

create table if not exists public.criancas (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  data_nascimento      date,
  idade                integer,
  sexo                 text,
  diagnostico          text,
  cid                  text,
  serie                text,
  escola_id            uuid references public.escolas(id),
  responsavel          text,
  telefone_responsavel text,
  email_responsavel    text,
  instagram            text,
  cpf                  text,
  foto_url             text,
  plano_saude          text,
  numero_processo      text,
  modalidade           text,
  valor_sessao         numeric(10,2),
  alergias             text,
  medicamentos         text,
  observacoes          text,
  ativo                boolean default true,
  created_at           timestamptz
);

-- Responsáveis / família
create table if not exists public.responsaveis (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  email      text not null,
  cpf        text,
  endereco   text,
  telefone   text,
  crianca_id uuid references public.criancas(id),
  ativo      boolean default true,
  created_at timestamptz
);

-- Vínculo família ↔ usuário
create table if not exists public.familias (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id) on delete cascade,
  crianca_id uuid references public.criancas(id) on delete cascade,
  parentesco text not null,
  telefone   text,
  email      text,
  instagram  text,
  created_at timestamptz not null default now()
);

-- Equipe atribuída a cada criança
create table if not exists public.equipe_crianca (
  id         uuid primary key default gen_random_uuid(),
  crianca_id uuid not null references public.criancas(id) on delete cascade,
  usuario_id uuid not null,
  funcao     text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PLANOS DE SAÚDE E AUTORIZAÇÕES
-- ---------------------------------------------------------------------------

create table if not exists public.planos_saude (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  codigo_ans      text,
  telefone        text,
  email_cobranca  text,
  obs             text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Vínculo criança ↔ plano
create table if not exists public.crianca_plano (
  id                uuid primary key default gen_random_uuid(),
  crianca_id        uuid not null references public.criancas(id) on delete cascade,
  plano_id          uuid not null references public.planos_saude(id),
  numero_carteirinha text,
  modalidade        modalidade_atendimento not null,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Liminares judiciais
create table if not exists public.liminares (
  id              uuid primary key default gen_random_uuid(),
  crianca_id      uuid not null references public.criancas(id) on delete cascade,
  plano_id        uuid references public.planos_saude(id),
  numero_processo text,
  vara            text,
  data_concessao  date,
  data_vencimento date,
  horas_semanais  numeric(10,2),
  total_horas_mes numeric(10,2),
  valor_hora      numeric(10,2),
  status          status_geral not null default 'ativo',
  obs             text,
  created_at      timestamptz not null default now()
);

-- Convênios
create table if not exists public.convenios (
  id                 uuid primary key default gen_random_uuid(),
  crianca_id         uuid not null references public.criancas(id) on delete cascade,
  nome               text not null,
  numero_autorizacao text,
  data_inicio        date,
  data_vencimento    date,
  horas_autorizadas  numeric(10,2),
  horas_utilizadas   numeric(10,2),
  status             status_geral not null default 'ativo',
  obs                text,
  created_at         timestamptz not null default now()
);

-- Guias de autorização
create table if not exists public.guias_autorizacao (
  id                uuid primary key default gen_random_uuid(),
  crianca_id        uuid not null references public.criancas(id) on delete cascade,
  plano_id          uuid not null references public.planos_saude(id),
  convenio_id       uuid references public.convenios(id),
  numero_guia       text not null,
  data_autorizacao  date not null,
  data_vencimento   date,
  horas_autorizadas numeric(10,2),
  horas_utilizadas  numeric(10,2),
  status            status_geral not null default 'ativo',
  obs               text,
  created_at        timestamptz not null default now()
);

-- Cobranças
create table if not exists public.cobrancas (
  id              uuid primary key default gen_random_uuid(),
  crianca_id      uuid not null references public.criancas(id) on delete cascade,
  modalidade      modalidade_atendimento not null,
  plano_id        uuid references public.planos_saude(id),
  liminar_id      uuid references public.liminares(id),
  convenio_id     uuid references public.convenios(id),
  descricao       text not null,
  valor           numeric(10,2) not null,
  data_vencimento date not null,
  data_pagamento  date,
  status          status_geral not null default 'pendente',
  obs             text,
  created_at      timestamptz not null default now()
);

-- Glosas (contestações de cobrança)
create table if not exists public.glosas (
  id           uuid primary key default gen_random_uuid(),
  guia_id      uuid not null references public.guias_autorizacao(id),
  crianca_id   uuid not null references public.criancas(id),
  valor_glosado numeric(10,2) not null,
  motivo       text not null,
  data_glosa   date not null,
  status       text not null,
  obs          text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ATENDIMENTOS E ESCALA
-- ---------------------------------------------------------------------------

-- Tipos de atendimento (serviços)
create table if not exists public.tipos_atendimento (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cor        text,
  ativo      boolean default true,
  created_at timestamptz
);

-- Escala semanal recorrente (criada pela ADM)
-- Nota: crianca, servico e profissional_nome são texto por design atual.
-- profissional_id referencia atendentes quando preenchido.
create table if not exists public.escala (
  id               uuid primary key default gen_random_uuid(),
  dia              text not null,        -- "Segunda", "Terça", etc.
  horario          text not null,        -- "13:00 – 14:00"
  crianca          text not null,        -- nome da criança (desnormalizado)
  servico          text not null,        -- tipo de serviço (desnormalizado)
  profissional_id  uuid references public.atendentes(id),
  profissional_nome text,               -- nome (desnormalizado)
  created_at       timestamptz
);

-- Horários disponíveis na escala
create table if not exists public.horarios_escala (
  id         uuid primary key default gen_random_uuid(),
  horario    text not null,
  ordem      integer,
  ativo      boolean default true,
  created_at timestamptz
);

-- Agenda com datas específicas (para atendentes terapêuticos)
-- Nota: at_id = atendente terapêutico. especialista_id = especialista (nullable).
-- hora, especialista_id são colunas legadas mantidas por compatibilidade.
create table if not exists public.agenda (
  id            uuid primary key default gen_random_uuid(),
  crianca_id    uuid not null references public.criancas(id),
  at_id         uuid not null references public.atendentes(id),
  data          date not null,
  hora_inicio   time not null,
  hora_fim      time not null,
  local         local_atendimento not null,
  local_detalhe text,
  modalidade    modalidade_atendimento not null,
  status        text not null default 'agendado',
  observacao    text,
  tipo          text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  -- colunas legadas
  hora          time,
  especialista_id uuid references public.atendentes(id)
);

-- Atendimentos registrados
create table if not exists public.atendimentos (
  id          uuid primary key default gen_random_uuid(),
  atendente_id uuid not null references public.atendentes(id),
  crianca_id  uuid references public.criancas(id),   -- deveria ser NOT NULL
  data        date not null,
  horas       numeric(10,2) not null,
  entrada     time,
  saida       time,
  local       local_atendimento not null,
  modalidade  modalidade_atendimento not null,
  valor_hora  numeric(10,2) not null,
  valor_total numeric(10,2) not null,
  valor       numeric(10,2),                          -- coluna legada
  ocorrencia  text,
  relatorio   text,                                   -- legado: use prontuarios
  status      status_atendimento not null default 'pendente',
  created_at  timestamptz not null default now()
);

-- Formulários escolares (comunicado diário dos ATs)
create table if not exists public.formularios_escolares (
  id                  uuid primary key default gen_random_uuid(),
  at_id               uuid not null references public.atendentes(id),
  crianca_id          uuid not null references public.criancas(id),
  data                date not null,
  hora_chegada        text,
  interacao           text[],
  autonomia_nivel     integer,
  periodo_menstrual   boolean,
  idas_banheiro       integer,
  evacuou             boolean,
  socializacao        text[],
  atencao             text[],
  lanche              text,
  comeu_tudo          boolean,
  atividades_sala     text,
  tarefa_casa         text,
  materiais_pedir     text,
  obs_gerais          text,
  obs_supervisora     text,
  enviado_supervisora boolean,
  enviado_familia     boolean,
  status              text not null default 'pendente',
  created_at          timestamptz not null default now()
);

-- Prontuários e relatórios clínicos
create table if not exists public.prontuarios (
  id                uuid primary key default gen_random_uuid(),
  crianca_id        uuid not null references public.criancas(id),
  autor_id          uuid not null,   -- auth.uid() do especialista/atendente
  tipo              text not null,   -- "prontuario", "relatorio", "sessao_dtt"
  titulo            text not null,
  conteudo          text not null,   -- JSON stringificado
  visivel_familia   boolean default false,
  visivel_supervisora boolean default true,
  visivel_gestao    boolean default true,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FINANCEIRO
-- ---------------------------------------------------------------------------

-- Contas a pagar (despesas operacionais)
create table if not exists public.contas_pagar (
  id          uuid primary key default gen_random_uuid(),
  descricao   text not null,
  categoria   text not null,
  valor       numeric(10,2) not null,
  vencimento  date not null,
  status      text default 'pendente',
  pago_em     date,
  observacao  text,
  created_at  timestamptz
);

-- Modelos reutilizáveis de contas a pagar
create table if not exists public.contas_pagar_modelos (
  id          uuid primary key default gen_random_uuid(),
  descricao   text not null,
  categoria   text not null,
  valor       numeric(10,2),
  observacao  text,
  created_at  timestamptz not null default now()
);

-- Contas a receber (faturamento por criança/plano)
create table if not exists public.contas_receber (
  id                  uuid primary key default gen_random_uuid(),
  crianca_id          uuid references public.criancas(id),
  mes_referencia      text not null,   -- formato "YYYY-MM"
  sessoes_realizadas  integer,
  valor_sessao        numeric(10,2),
  valor_total         numeric(10,2),
  desconto_iss        numeric(10,2),
  valor_liquido       numeric(10,2),
  plano_saude         text,
  numero_processo     text,
  numero_nota_fiscal  text,
  data_envio          date,
  especialidades      jsonb,
  status              text default 'pendente',
  faturado_em         date,
  recebido_em         date,
  observacao          text,
  created_at          timestamptz
);

-- Folha de pagamento dos profissionais
create table if not exists public.folha_pagamento (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid references public.atendentes(id),
  mes             integer not null,
  ano             integer not null,
  valor_base      numeric(10,2) not null,
  adiantamento    numeric(10,2),
  desconto        numeric(10,2),
  valor_final     numeric(10,2),
  status          text default 'pendente',
  data_pagamento  date,
  observacao      text,
  created_at      timestamptz
);

-- Financeiro operacional (shadow de atendimentos — legado)
-- Nota: esta tabela duplica dados de atendimentos. Mantida por compatibilidade.
create table if not exists public.financeiro (
  id               uuid primary key default gen_random_uuid(),
  atendimento_id   uuid references public.atendimentos(id),
  atendente_id     uuid references public.atendentes(id),
  data             date not null,
  local            text not null,
  valor            numeric(10,2) not null,
  valor_total      numeric(10,2),
  horas            numeric(10,2),
  status           text not null,
  relatorio        text,
  crianca          text,
  data_pagamento   timestamp
);

-- ---------------------------------------------------------------------------
-- COMUNICAÇÃO
-- ---------------------------------------------------------------------------

-- Mural de avisos
create table if not exists public.mural (
  id          uuid primary key default gen_random_uuid(),
  autor_id    uuid not null,
  titulo      text not null,
  conteudo    text not null,
  fixado      boolean not null default false,
  destinatario text not null,   -- "todos", "atendente", "especialista", etc.
  created_at  timestamptz not null default now()
);

-- Notificações internas por role
create table if not exists public.notificacoes (
  id                uuid primary key default gen_random_uuid(),
  destinatario_role text not null,
  titulo            text not null,
  mensagem          text,
  tipo              text not null,
  lida              boolean not null default false,
  link              text,
  autor_nome        text,
  created_at        timestamptz not null default now()
);

-- Eventos e calendário
create table if not exists public.eventos (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descricao   text,
  data_inicio timestamptz not null,
  data_fim    timestamptz,
  local       text,
  destinatario text not null,
  criado_por  uuid,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CHAT
-- ---------------------------------------------------------------------------

-- Regras de permissão do chat por role
create table if not exists public.regras_chat (
  id           uuid primary key default gen_random_uuid(),
  role_origem  user_role_v2 not null,
  role_destino user_role_v2 not null,
  permitido    boolean not null default true
);

-- Conversas
create table if not exists public.conversas (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null default 'privado',
  nome           text,
  crianca_id     uuid references public.criancas(id),
  participante_a uuid,
  participante_b uuid,
  created_at     timestamptz not null default now()
);

-- Participantes de conversas em grupo
create table if not exists public.conversa_participantes (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  usuario_id  uuid not null,
  created_at  timestamptz not null default now()
);

-- Mensagens do chat
create table if not exists public.mensagens_chat (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  autor_id    uuid not null,
  conteudo    text not null,
  lida        boolean not null default false,
  reacoes     jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PORTAL DA FAMÍLIA
-- ---------------------------------------------------------------------------

create table if not exists public.portal_momentos (
  id          uuid primary key default gen_random_uuid(),
  crianca_id  uuid references public.criancas(id),
  descricao   text,
  imagem_url  text not null,
  autor_id    uuid,
  created_at  timestamptz
);

create table if not exists public.portal_evolucao (
  id          uuid primary key default gen_random_uuid(),
  crianca_id  uuid references public.criancas(id),
  titulo      text not null,
  conteudo    text not null,
  autor_id    uuid,
  created_at  timestamptz
);

create table if not exists public.portal_comunicados (
  id          uuid primary key default gen_random_uuid(),
  crianca_id  uuid references public.criancas(id),
  titulo      text not null,
  conteudo    text,
  autor_id    uuid,
  created_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- AUDITORIA
-- ---------------------------------------------------------------------------

create table if not exists public.log_auditoria (
  id            uuid primary key default gen_random_uuid(),
  usuario_email text not null,
  usuario_nome  text,
  acao          text not null,
  tabela        text,
  registro_id   text,
  descricao     text,
  created_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- RLS (Row Level Security)
-- ---------------------------------------------------------------------------
-- Política atual: permissiva (auth.uid() is not null) na maioria das tabelas.
-- Refinar por tabela conforme necessário.

alter table public.usuarios              enable row level security;
alter table public.atendentes            enable row level security;
alter table public.criancas              enable row level security;
alter table public.atendimentos          enable row level security;
alter table public.prontuarios           enable row level security;
alter table public.formularios_escolares enable row level security;
alter table public.mural                 enable row level security;
alter table public.notificacoes          enable row level security;
alter table public.conversas             enable row level security;
alter table public.mensagens_chat        enable row level security;
alter table public.agenda                enable row level security;
alter table public.escala                enable row level security;
alter table public.financeiro            enable row level security;
alter table public.contas_pagar          enable row level security;
alter table public.contas_receber        enable row level security;
alter table public.folha_pagamento       enable row level security;

-- Funções auxiliares para políticas RLS
create or replace function public.meu_role()
returns text language sql security definer stable as $$
  select coalesce(
    (select role::text from public.usuarios   where auth_id = auth.uid()),
    (select role::text from public.atendentes where email   = auth.email()),
    ''
  )
$$;

create or replace function public.meu_atendente_id()
returns uuid language sql security definer stable as $$
  select id from public.atendentes where email = auth.email()
$$;

create or replace function public.minha_crianca_id()
returns uuid language sql security definer stable as $$
  select crianca_id from public.responsaveis
  where email = auth.email() and ativo = true limit 1
$$;

-- Tabelas operacionais — qualquer autenticado (baixo risco, refinamento futuro)
create policy "acesso_autenticado" on public.criancas
  for all using (auth.uid() is not null);

create policy "acesso_autenticado" on public.atendimentos
  for all using (auth.uid() is not null);

create policy "acesso_autenticado" on public.agenda
  for all using (auth.uid() is not null);

create policy "acesso_autenticado" on public.escala
  for all using (auth.uid() is not null);

create policy "acesso_autenticado" on public.mural
  for all using (auth.uid() is not null);

create policy "acesso_autenticado" on public.notificacoes
  for all using (auth.uid() is not null);

create policy "acesso_autenticado" on public.conversas
  for all using (auth.uid() is not null);

create policy "acesso_autenticado" on public.mensagens_chat
  for all using (auth.uid() is not null);

-- Prontuários — especialista vê os seus; adm/gestao/supervisora veem tudo
create policy "prontuario_select" on public.prontuarios
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
    or autor_id = public.meu_atendente_id()
  );
create policy "prontuario_insert" on public.prontuarios
  for insert with check (public.meu_role() in ('adm', 'admin', 'gestao', 'especialista'));
create policy "prontuario_update" on public.prontuarios
  for update using (public.meu_role() in ('adm', 'admin', 'gestao') or autor_id = public.meu_atendente_id());
create policy "prontuario_delete" on public.prontuarios
  for delete using (public.meu_role() in ('adm', 'admin', 'gestao'));

-- Formulários escolares — família lê só da sua criança; atendente escreve os seus
create policy "formulario_select" on public.formularios_escolares
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'atendente', 'at')
    or crianca_id = public.minha_crianca_id()
  );
create policy "formulario_insert" on public.formularios_escolares
  for insert with check (public.meu_role() in ('atendente', 'at', 'adm', 'admin', 'gestao'));
create policy "formulario_update" on public.formularios_escolares
  for update using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
    or (public.meu_role() in ('atendente', 'at') and at_id = public.meu_atendente_id())
  );

-- Tabelas financeiras — só adm e financeiro
create policy "financeiro_acesso" on public.contas_pagar
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro'));
create policy "financeiro_acesso" on public.contas_receber
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro'));
create policy "financeiro_acesso" on public.folha_pagamento
  for all using (public.meu_role() in ('adm', 'admin', 'financeiro', 'gestao'));

-- Usuários — adm/gestao veem todos; cada um vê/edita o próprio
create policy "usuarios_select" on public.usuarios
  for select using (public.meu_role() in ('adm', 'admin', 'gestao') or auth_id = auth.uid());
create policy "usuarios_update" on public.usuarios
  for update using (public.meu_role() in ('adm', 'admin') or auth_id = auth.uid());

-- Atendentes — adm/gestao/supervisora veem todos; cada um vê/edita o próprio
create policy "atendentes_select" on public.atendentes
  for select using (public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora') or email = auth.email());
create policy "atendentes_update" on public.atendentes
  for update using (public.meu_role() in ('adm', 'admin', 'gestao') or email = auth.email());
create policy "atendentes_insert" on public.atendentes
  for insert with check (public.meu_role() in ('adm', 'admin', 'gestao'));
create policy "atendentes_delete" on public.atendentes
  for delete using (public.meu_role() in ('adm', 'admin'));

-- ---------------------------------------------------------------------------
-- STORAGE (buckets criados via Supabase Dashboard)
-- ---------------------------------------------------------------------------

-- fotos-criancas: fotos de perfil das crianças (public)
-- chat-uploads:   arquivos enviados no chat (authenticated)

create policy "chat_uploads_select" on storage.objects
  for select using (bucket_id = 'chat-uploads');

create policy "chat_uploads_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-uploads');

create policy "chat_uploads_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-uploads' and auth.uid() = owner);

-- Pauta pessoal da diretora (gerida pela aux_adm, confirmada pela gestão)
create table if not exists public.pauta_diretora (
  id         uuid primary key default gen_random_uuid(),
  data       date not null,
  hora       text,
  hora_fim   text,
  tipo       text not null default 'outro',
  titulo     text not null,
  modalidade text,
  observacao text,
  status     text not null default 'pendente',
  obs_simone text,
  created_at timestamptz not null default now()
);

alter table public.pauta_diretora enable row level security;

create policy "acesso_autenticado" on public.pauta_diretora
  for all using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- NOTAS DE DÉBITO TÉCNICO
-- ---------------------------------------------------------------------------
-- 1. `financeiro` duplica dados de `atendimentos` — candidata a remoção futura.
-- 2. `atendimentos.crianca_id` deveria ser NOT NULL.
-- 3. `escala` usa texto livre (crianca, servico, profissional_nome) em vez de FKs.
-- 4. `agenda` mantém colunas legadas: `hora` e `especialista_id` (nullable).
-- 5. Três tabelas de usuário: `usuarios`, `atendentes`, `perfis` (legada).
--    Consolidação futura recomendada em `usuarios` + `atendentes`.
-- 6. `perfis` é legada — mantida para não quebrar queries existentes.
-- =============================================================================
