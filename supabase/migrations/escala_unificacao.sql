-- Ja aplicada em producao via mcp__supabase__apply_migration.
-- Suporte a unificacao da Escala Especialistas + Escala Acompanhantes numa
-- unica tela "ESCALA":
--
-- 1) escala_nomes_avulsos ganha "categoria" (especialista/atendente) — pra
--    quando alguem digita um nome sem cadastro na hora de montar a escala,
--    o sistema saber pra sempre depois se separa como especialista ou AT
--    na impressao/relatorios (antes so descobria isso olhando o cargo
--    cadastrado em "atendentes", o que nao existe pra nome avulso).
--
-- 2) escala_lanche — horario do lanche do dia (um valor por dia da semana,
--    nao por atendimento), editavel pela Supervisora/ADM.

alter table public.escala_nomes_avulsos
  add column if not exists categoria text
    check (categoria in ('especialista', 'atendente'));

create table if not exists public.escala_lanche (
  dia               text primary key,
  horario           text,
  atualizado_por_email text,
  atualizado_por_nome  text,
  atualizado_em     timestamptz not null default now()
);

alter table public.escala_lanche enable row level security;

drop policy if exists "escala_lanche_select" on public.escala_lanche;
create policy "escala_lanche_select" on public.escala_lanche
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora', 'financeiro')
  );

drop policy if exists "escala_lanche_gerencia" on public.escala_lanche;
create policy "escala_lanche_gerencia" on public.escala_lanche
  for all
  using (public.meu_role() in ('adm', 'admin', 'supervisora'))
  with check (public.meu_role() in ('adm', 'admin', 'supervisora'));
