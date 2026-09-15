-- Pedido da Simone (Gestao): depois de suspender o emprestimo de materiais
-- por perda/quebra, ela quer reabrir pra AT (todas, escola+clinica) e pras
-- pedagogas Paula e Vera, mas agora com uma declaracao de responsabilidade
-- no ato do recebimento.
--
-- Ana Paula (id d223aae1-7ce4-4d87-bef0-29bbbfdbb977) ja e role='atendente',
-- entao cai na regra geral. Vera (id f2f0fba1-06e8-4076-8533-0b20acc28e20) e
-- supervisora — excecao nomeada, igual ja se faz noutras politicas deste
-- sistema pra pessoa especifica fora do role padrao.
create table if not exists public.materiais_recebidos (
  id                 uuid primary key default gen_random_uuid(),
  solicitante_id     uuid not null,
  solicitante_nome   text not null,
  solicitante_role   text,
  material           text not null,
  quantidade         integer not null default 1,
  observacao         text,
  texto_declaracao   text not null,
  declarado_em       timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

alter table public.materiais_recebidos enable row level security;

-- Quem recebeu ve o proprio historico; Adm/Gestao/Supervisora veem tudo
-- (e' o ponto principal do pedido: rastrear responsabilidade).
create policy "materiais_recebidos_select" on public.materiais_recebidos
  for select using (
    solicitante_id = auth.uid()
    or public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora')
  );

-- So AT (todas) ou Vera (excecao nomeada) registram recebimento, e so em
-- nome proprio.
create policy "materiais_recebidos_insert" on public.materiais_recebidos
  for insert with check (
    solicitante_id = auth.uid()
    and (public.meu_role() = 'atendente' or public.meu_atendente_id() = 'f2f0fba1-06e8-4076-8533-0b20acc28e20')
  );

-- Registro de responsabilidade nunca editavel/apagavel por quem recebeu —
-- so Adm/Gestao podem remover em caso de erro de lancamento.
create policy "materiais_recebidos_delete" on public.materiais_recebidos
  for delete using (public.meu_role() in ('adm', 'admin', 'gestao'));
