-- Acesso "só ver" à Agenda da Simone, por pessoa (pedido da ADM pra Carol:
-- enxerga só a parte profissional e não pode criar/editar/apagar).
alter table public.atendentes
  add column if not exists pauta_diretora_so_leitura boolean not null default false;

create or replace function public.pauta_so_leitura()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select pauta_diretora_so_leitura from public.atendentes where email = auth.email() limit 1), false)
$$;

-- Compromissos pessoais da Simone só chegam pra quem tem
-- pauta_diretora_ve_pessoal (antes a tela só escondia; o banco entregava).
create or replace function public.pauta_ve_pessoal()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select pauta_diretora_ve_pessoal from public.atendentes where email = auth.email() limit 1), true)
$$;

-- Antes era uma regra só (ALL) pra ver e mexer; agora ver e mexer são separados.
drop policy if exists pauta_acesso on public.pauta_diretora;
drop policy if exists pauta_ver on public.pauta_diretora;
create policy pauta_ver on public.pauta_diretora for select using (
  meu_role() = any (array['adm','admin','gestao','aux_adm','supervisora'])
  and (pauta_ve_pessoal() or tipo like 'atend\_%' or tipo in ('supervisao','reuniao'))
);
create policy pauta_criar on public.pauta_diretora for insert
  with check (meu_role() = any (array['adm','admin','gestao','aux_adm','supervisora']) and not pauta_so_leitura());
create policy pauta_editar on public.pauta_diretora for update
  using (meu_role() = any (array['adm','admin','gestao','aux_adm','supervisora']) and not pauta_so_leitura())
  with check (meu_role() = any (array['adm','admin','gestao','aux_adm','supervisora']) and not pauta_so_leitura());
create policy pauta_apagar on public.pauta_diretora for delete
  using (meu_role() = any (array['adm','admin','gestao','aux_adm','supervisora']) and not pauta_so_leitura());

-- Carol (Ana Carolina Borges Telles): vê só a agenda profissional, sem editar
update public.atendentes
   set acesso_pauta_diretora = true, pauta_diretora_ve_pessoal = false, pauta_diretora_so_leitura = true
 where lower(email) = 'psi.anatelles@gmail.com';
