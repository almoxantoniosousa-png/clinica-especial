-- =============================================================================
-- MATERIAIS DE LIMPEZA — estoque acompanhado pela ADM, retirada pela Apoio (Ieda)
-- =============================================================================

create table if not exists public.materiais_limpeza (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  unidade           text not null default 'un',
  quantidade_atual  numeric not null default 0,
  quantidade_minima numeric,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.materiais_limpeza_movimentacoes (
  id               uuid primary key default gen_random_uuid(),
  material_id      uuid not null references public.materiais_limpeza(id) on delete cascade,
  tipo             text not null check (tipo in ('entrada', 'saida')),
  quantidade       numeric not null check (quantidade > 0),
  responsavel_id   uuid not null,
  responsavel_nome text not null,
  observacao       text,
  created_at       timestamptz not null default now()
);

-- Registra a movimentação e já atualiza o saldo do material numa unica
-- transacao (SECURITY DEFINER, mesmo padrao ja usado noutras partes do
-- sistema pra escrita controlada) -- evita duplicar a logica de saldo no
-- client e evita corrida entre "ler saldo" e "gravar saldo".
create or replace function public.registrar_movimentacao_material(
  p_material_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_observacao text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_nome text;
begin
  select role::text into v_role from atendentes where id = auth.uid();
  if v_role is null then
    select role::text into v_role from usuarios where id = auth.uid();
  end if;
  if v_role not in ('adm', 'admin', 'apoio') then
    raise exception 'Sem permissao para movimentar estoque de materiais.';
  end if;

  select nome into v_nome from atendentes where id = auth.uid();
  if v_nome is null then
    select nome into v_nome from usuarios where id = auth.uid();
  end if;

  insert into materiais_limpeza_movimentacoes (material_id, tipo, quantidade, responsavel_id, responsavel_nome, observacao)
  values (p_material_id, p_tipo, p_quantidade, auth.uid(), coalesce(v_nome, 'Sistema'), p_observacao);

  update materiais_limpeza
  set quantidade_atual = greatest(0, quantidade_atual + case when p_tipo = 'entrada' then p_quantidade else -p_quantidade end)
  where id = p_material_id;
end;
$$;

alter table public.materiais_limpeza enable row level security;
alter table public.materiais_limpeza_movimentacoes enable row level security;

drop policy if exists "materiais_limpeza_select" on public.materiais_limpeza;
create policy "materiais_limpeza_select" on public.materiais_limpeza
  for select using (meu_role() in ('adm', 'admin', 'apoio', 'gestao'));

drop policy if exists "materiais_limpeza_cadastro" on public.materiais_limpeza;
create policy "materiais_limpeza_cadastro" on public.materiais_limpeza
  for all using (meu_role() in ('adm', 'admin'))
  with check (meu_role() in ('adm', 'admin'));

drop policy if exists "materiais_limpeza_mov_select" on public.materiais_limpeza_movimentacoes;
create policy "materiais_limpeza_mov_select" on public.materiais_limpeza_movimentacoes
  for select using (meu_role() in ('adm', 'admin', 'apoio', 'gestao'));

-- Inserção só via registrar_movimentacao_material (SECURITY DEFINER) —
-- sem policy de insert direta, ninguém grava na tabela sem passar pela função.

-- Catálogo inicial pedido pela Gestão (03/09/2026)
insert into materiais_limpeza (nome, unidade) values
  ('Copo descartável', 'pacote'),
  ('Papel toalha', 'rolo'),
  ('Detergente', 'un'),
  ('Papel higiênico', 'rolo'),
  ('Pano de chão', 'un'),
  ('Vassoura', 'un'),
  ('Bucha de prato', 'un'),
  ('Bom ar', 'un')
on conflict do nothing;
