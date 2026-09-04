-- A tela do Mural já filtra por destinatário no cliente (.in("destinatario",
-- alvos)), mas a RLS de SELECT liberava qualquer conta não-família ver TODAS
-- as linhas, inclusive as endereçadas só a outro cargo/pessoa específica —
-- o filtro do cliente era só cosmético, dava pra contornar em qualquer chamada
-- direta à API. Agora a própria política restringe: ADM/Gestão/Supervisora
-- continuam vendo tudo (moderação, já era assim); os demais cargos só veem
-- "todos", o que é destinado ao próprio cargo, ou o que foi endereçado a
-- eles por nome ("Colaborador específico"). Família continua bloqueada por
-- completo, sem mudança (comportamento pré-existente).
create or replace function public.meu_nome()
returns text language sql security definer stable as $$
  select coalesce(
    (select nome from public.usuarios   where auth_id = auth.uid()),
    (select nome from public.atendentes where email   = auth.email()),
    ''
  )
$$;

drop policy if exists "mural_select_all" on public.mural;
create policy "mural_select_all"
  on public.mural
  for select
  using (
    meu_role() <> 'familia' and meu_role() <> ''
    and (
      meu_role() in ('adm', 'gestao', 'supervisora')
      or destinatario = 'todos'
      or destinatario = meu_role()
      or destinatario = meu_nome()
    )
  );
