-- Reestrutura Ocorrência Diária: um registro por dia por pessoa, com vários itens
-- (ocorrências) dentro, assinado uma única vez no final do dia (fecha o dia).
-- Antes: 1 ocorrência = 1 texto = 1 assinatura. Agora: 1 dia = N itens = 1 assinatura.

create table public.ocorrencias_diarias_itens (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.ocorrencias_diarias(id) on delete cascade,
  texto text not null,
  foto_url text,
  created_at timestamptz not null default now()
);

-- Migra o texto/foto já existentes em ocorrencias_diarias para o primeiro item de cada dia.
insert into public.ocorrencias_diarias_itens (ocorrencia_id, texto, foto_url, created_at)
select id, texto, foto_url, created_at from public.ocorrencias_diarias;

alter table public.ocorrencias_diarias drop column texto;
alter table public.ocorrencias_diarias drop column foto_url;

alter table public.ocorrencias_diarias_itens enable row level security;

create policy ocorrencias_itens_select on public.ocorrencias_diarias_itens
  for select using (meu_role() = any (array['adm', 'admin', 'aux_adm', 'gestao']));

create policy ocorrencias_itens_insert on public.ocorrencias_diarias_itens
  for insert with check (
    meu_role() = any (array['adm', 'admin', 'aux_adm'])
    and exists (
      select 1 from public.ocorrencias_diarias o
      where o.id = ocorrencia_id
        and o.autor_email = auth.email()
        and o.assinado_em is null
    )
  );

create policy ocorrencias_itens_update on public.ocorrencias_diarias_itens
  for update using (
    meu_role() = any (array['adm', 'admin', 'aux_adm'])
    and exists (
      select 1 from public.ocorrencias_diarias o
      where o.id = ocorrencia_id
        and o.autor_email = auth.email()
        and o.assinado_em is null
    )
  );

create policy ocorrencias_itens_delete on public.ocorrencias_diarias_itens
  for delete using (
    meu_role() = any (array['adm', 'admin'])
    or (
      meu_role() = any (array['adm', 'admin', 'aux_adm'])
      and exists (
        select 1 from public.ocorrencias_diarias o
        where o.id = ocorrencia_id
          and o.autor_email = auth.email()
          and o.assinado_em is null
      )
    )
  );

-- Deixa o dono também excluir o dia inteiro antes de assinar (não só ADM).
alter policy ocorrencias_diarias_delete on public.ocorrencias_diarias
  using (
    meu_role() = any (array['adm', 'admin'])
    or (
      meu_role() = any (array['adm', 'admin', 'aux_adm'])
      and autor_email = auth.email()
      and assinado_em is null
    )
  );
