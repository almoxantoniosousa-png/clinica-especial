-- =============================================================================
-- CONFIRMAÇÕES DE LEITURA — registra quem leu/confirmou cada protocolo de conduta
-- Rodar no SQL Editor do Supabase (cole cada bloco em uma única linha)
-- =============================================================================

create table if not exists public.protocolos_confirmacoes (id uuid primary key default gen_random_uuid(), protocolo_id uuid not null references public.protocolos_conduta(id) on delete cascade, pessoa_id uuid not null, pessoa_nome text not null, pessoa_role text not null, confirmado_em timestamptz not null default now(), unique (protocolo_id, pessoa_id));

alter table public.protocolos_confirmacoes enable row level security;

drop policy if exists "confirmacoes_acesso" on public.protocolos_confirmacoes;

create policy "confirmacoes_acesso" on public.protocolos_confirmacoes for all using ( auth.uid() is not null );
