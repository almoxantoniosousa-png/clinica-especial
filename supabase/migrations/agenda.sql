-- Rodar no SQL Editor do Supabase

create table if not exists public.agenda (
  id              uuid         primary key default gen_random_uuid(),
  especialista_id uuid         not null references public.atendentes(id) on delete cascade,
  crianca_id      uuid         not null references public.criancas(id)   on delete cascade,
  data            date         not null,
  hora            text         not null,
  tipo            text         not null default 'sessao',
  observacao      text,
  status          text         not null default 'agendado',
  created_at      timestamptz  not null default now()
);

alter table public.agenda enable row level security;

-- Especialistas gerenciam a própria agenda
create policy "agenda_especialista" on public.agenda
  for all
  using  (auth.uid() is not null)
  with check (auth.uid() is not null);
