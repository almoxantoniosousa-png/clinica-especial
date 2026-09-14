-- Protótipo: registro de não conformidade ao Protocolo de Conduta, pensado
-- pra colaboradores PJ (ATs). Deliberadamente NÃO chamado de "avaliação de
-- desempenho" nem "advertência" -- são termos de vínculo empregatício (CLT).
-- Aqui é enforcement de obrigação contratual (descumprimento de protocolo
-- que já é cláusula do contrato de prestação de serviço), documentado com
-- fato objetivo e datado, com ciência formal via assinatura da própria AT.
-- Nunca editável depois de criado (histórico íntegro).
create table if not exists public.nao_conformidades (
  id                 uuid primary key default gen_random_uuid(),
  atendente_id       uuid not null references public.atendentes(id),
  data_fato          date not null,
  protocolo_id       uuid references public.protocolos_conduta(id),
  protocolo_titulo   text,
  descricao          text not null,
  anexo_url          text,
  registrado_por_id  uuid,
  registrado_por_nome text not null,
  assinatura_base64  text,
  assinado_em        timestamptz,
  created_at         timestamptz not null default now()
);

alter table public.nao_conformidades enable row level security;

-- Supervisora/Gestão/ADM criam e veem tudo.
create policy "nao_conformidades_gerenciar"
  on public.nao_conformidades
  for all
  using (public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora'))
  with check (public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora'));

-- AT vê só a própria.
create policy "nao_conformidades_select_propria"
  on public.nao_conformidades
  for select
  using (atendente_id = public.meu_atendente_id());

-- AT só pode atualizar (assinar) a própria, e só enquanto ainda não assinada
-- -- depois de assinado, fica travado (histórico íntegro).
create policy "nao_conformidades_assinar_propria"
  on public.nao_conformidades
  for update
  using (atendente_id = public.meu_atendente_id() and assinado_em is null)
  with check (atendente_id = public.meu_atendente_id());

-- Bucket pra anexo (prova/print), reaproveitando padrão de outros buckets.
insert into storage.buckets (id, name, public)
values ('nao-conformidades-anexos', 'nao-conformidades-anexos', true)
on conflict (id) do nothing;

create policy "nao_conformidades_anexos_insert"
  on storage.objects
  for insert
  with check (bucket_id = 'nao-conformidades-anexos' and public.meu_role() in ('adm', 'admin', 'gestao', 'supervisora'));

create policy "nao_conformidades_anexos_select"
  on storage.objects
  for select
  using (bucket_id = 'nao-conformidades-anexos');
