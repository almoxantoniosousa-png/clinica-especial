-- =============================================================================
-- CARD COMPLETO DA CRIANÇA (Gestão) — liga a Entrevista Inicial ao cadastro
-- e permite a Gestão criar cadastros de criança direto
--
-- Contexto: a Simone pediu pra ter tudo sobre uma criança (cadastro,
-- entrevista inicial, prontuários, evolução, planos terapêuticos, materiais
-- adaptados, responsáveis do Portal) num card só, e poder criar o cadastro
-- das próximas crianças ela mesma — hoje só o ADM cadastra em `criancas`.
-- =============================================================================

-- 1) Liga entrevistas_iniciais à criança correspondente. Continua nullable —
--    a entrevista nasce solta (só telefone de contato) e só ganha crianca_id
--    quando a Simone marca "virou paciente" (o card nasce automático, puxando
--    o que os pais já responderam).
alter table public.entrevistas_iniciais add column if not exists crianca_id uuid references public.criancas(id);
create index if not exists idx_entrevistas_iniciais_crianca_id on public.entrevistas_iniciais(crianca_id);

-- 2) criancas: Gestão passa a poder inserir cadastro completo (antes só ADM
--    inseria com todos os campos; AT com faz_adaptado=true já podia inserir
--    um cadastro mínimo pra Materiais Adaptados — isso continua igual)
drop policy if exists "inserir_criancas_para_adm" on public.criancas;
create policy "inserir_criancas_para_adm" on public.criancas
  for insert with check (
    (exists (select 1 from atendentes where atendentes.id = auth.uid() and atendentes.role = 'adm'::user_role))
    or (public.meu_role() = 'gestao')
    or (
      (exists (select 1 from atendentes a where a.id = auth.uid() and a.faz_adaptado = true))
      and diagnostico is null and cid is null and medicamentos is null and alergias is null
      and cpf is null and nome_mae is null and nome_pai is null and numero_processo is null
    )
  );
