-- =============================================================================
-- PROTOCOLOS DE CONDUTA — diretrizes por cargo, geridas pelo adm
-- Rodar no SQL Editor do Supabase
-- =============================================================================

create table if not exists public.protocolos_conduta (
  id         uuid primary key default gen_random_uuid(),
  cargo      text not null,
  titulo     text not null,
  conteudo   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.protocolos_conduta enable row level security;

drop policy if exists "protocolos_acesso" on public.protocolos_conduta;
create policy "protocolos_acesso" on public.protocolos_conduta
  for all using (public.meu_role() in ('adm', 'admin'));
