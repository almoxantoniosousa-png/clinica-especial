-- Plano Terapêutico: cadastrado por Gestão + Supervisora numa reunião
-- (Especialistas também participam da reunião, mas só visualizam o
-- resultado pelo sistema — quem opera o cadastro é Gestão/Supervisora).
-- ADM não participa, mesmo padrão já usado no Registro ABC.
--
-- Não é pré-requisito pro Registro ABC — é o contrário: o histórico de
-- Registros ABC é que embasa a reunião onde esse plano é definido/revisado.

create table public.planos_terapeuticos (
  id uuid primary key default gen_random_uuid(),
  crianca_id uuid not null references public.criancas(id) on delete cascade,
  data_reuniao date not null,
  local_contexto text,
  participantes text[] not null default '{}',
  comportamentos_alvo jsonb not null default '[]',
  estrategias_gerais text,
  proxima_revisao date,
  criado_por_nome text,
  criado_por_id uuid,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planos_terapeuticos enable row level security;

create policy plano_terapeutico_select on public.planos_terapeuticos
  for select using (meu_role() = any (array['gestao', 'supervisora', 'especialista']));

create policy plano_terapeutico_insert on public.planos_terapeuticos
  for insert with check (meu_role() = any (array['gestao', 'supervisora']));

create policy plano_terapeutico_update on public.planos_terapeuticos
  for update using (meu_role() = any (array['gestao', 'supervisora']));

create policy plano_terapeutico_delete on public.planos_terapeuticos
  for delete using (meu_role() = any (array['gestao', 'supervisora']));
