-- Foto do produto + preço registrado a cada entrada (compra), só pra ADM acompanhar.

alter table public.materiais_limpeza
  add column if not exists foto_url text;

alter table public.materiais_limpeza_movimentacoes
  add column if not exists valor_unitario numeric(10, 2);

-- Atualiza a funcao de movimentacao pra aceitar o valor pago (so relevante em entrada).
create or replace function public.registrar_movimentacao_material(
  p_material_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_observacao text default null,
  p_valor_unitario numeric default null
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

  insert into materiais_limpeza_movimentacoes (material_id, tipo, quantidade, responsavel_id, responsavel_nome, observacao, valor_unitario)
  values (p_material_id, p_tipo, p_quantidade, auth.uid(), coalesce(v_nome, 'Sistema'), p_observacao, p_valor_unitario);

  update materiais_limpeza
  set quantidade_atual = greatest(0, quantidade_atual + case when p_tipo = 'entrada' then p_quantidade else -p_quantidade end)
  where id = p_material_id;
end;
$$;

-- Bucket de fotos dos produtos (publico pra leitura, escrita so pra ADM).
insert into storage.buckets (id, name, public)
values ('materiais-limpeza-fotos', 'materiais-limpeza-fotos', true)
on conflict (id) do nothing;

drop policy if exists "materiais_limpeza_fotos_select" on storage.objects;
create policy "materiais_limpeza_fotos_select" on storage.objects
  for select using (bucket_id = 'materiais-limpeza-fotos');

drop policy if exists "materiais_limpeza_fotos_insert" on storage.objects;
create policy "materiais_limpeza_fotos_insert" on storage.objects
  for insert with check (bucket_id = 'materiais-limpeza-fotos' and meu_role() in ('adm', 'admin'));

drop policy if exists "materiais_limpeza_fotos_update" on storage.objects;
create policy "materiais_limpeza_fotos_update" on storage.objects
  for update using (bucket_id = 'materiais-limpeza-fotos' and meu_role() in ('adm', 'admin'));

drop policy if exists "materiais_limpeza_fotos_delete" on storage.objects;
create policy "materiais_limpeza_fotos_delete" on storage.objects
  for delete using (bucket_id = 'materiais-limpeza-fotos' and meu_role() in ('adm', 'admin'));
