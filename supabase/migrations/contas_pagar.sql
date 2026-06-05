-- Rodar no SQL Editor do Supabase (https://app.supabase.com → SQL Editor)

-- Tabela principal de contas a pagar
create table if not exists public.contas_pagar (
  id          uuid         primary key default gen_random_uuid(),
  descricao   text         not null,
  categoria   text         not null default 'outro',
  valor       numeric(10,2) not null check (valor >= 0),
  vencimento  date         not null,
  observacao  text,
  status      text         not null default 'pendente',
  pago_em     date,
  created_at  timestamptz  not null default now()
);

-- Tabela de modelos reutilizáveis (contas salvas para reuso)
create table if not exists public.contas_pagar_modelos (
  id          uuid          primary key default gen_random_uuid(),
  descricao   text          not null,
  categoria   text          not null default 'outro',
  valor       numeric(10,2),
  observacao  text,
  created_at  timestamptz   not null default now()
);

-- Habilitar RLS
alter table public.contas_pagar         enable row level security;
alter table public.contas_pagar_modelos enable row level security;

-- Políticas: somente admins podem gerenciar contas a pagar
create policy "contas_pagar_adm" on public.contas_pagar
  for all
  using (
    auth.uid() is not null and
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.role = 'adm')
  )
  with check (
    auth.uid() is not null and
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.role = 'adm')
  );

create policy "contas_pagar_modelos_adm" on public.contas_pagar_modelos
  for all
  using (
    auth.uid() is not null and
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.role = 'adm')
  )
  with check (
    auth.uid() is not null and
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.role = 'adm')
  );
