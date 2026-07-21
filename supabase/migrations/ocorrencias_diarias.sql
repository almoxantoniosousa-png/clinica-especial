-- =============================================================================
-- Ocorrência Diária: registro de acontecimentos fora da normalidade,
-- substitui o caderno físico usado por ADM e Aux. Administrativa.
--
-- - ADM e Aux. Administrativa podem criar e assinar ocorrências
-- - Gestão só visualiza (sem insert/update/delete)
-- - Edição só é permitida no próprio registro, antes de ser assinado
-- - Exclusão restrita a ADM (mantém o registro como trilha permanente)
-- =============================================================================

create table public.ocorrencias_diarias (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  texto text not null,
  autor_email text not null,
  autor_nome text,
  foto_url text,
  assinatura_base64 text,
  assinado_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ocorrencias_diarias enable row level security;

create policy ocorrencias_diarias_select on public.ocorrencias_diarias
  for select using (meu_role() = any (array['adm', 'admin', 'aux_adm', 'gestao']));

create policy ocorrencias_diarias_insert on public.ocorrencias_diarias
  for insert with check (
    meu_role() = any (array['adm', 'admin', 'aux_adm'])
    and autor_email = auth.email()
  );

-- USING controla quais linhas podem ser tocadas (só a própria, ainda não assinada).
-- WITH CHECK valida o resultado da edição e não pode repetir "assinado_em is null",
-- senão o próprio ato de assinar (que preenche assinado_em) fica bloqueado.
create policy ocorrencias_diarias_update on public.ocorrencias_diarias
  for update
  using (
    meu_role() = any (array['adm', 'admin', 'aux_adm'])
    and autor_email = auth.email()
    and assinado_em is null
  )
  with check (
    meu_role() = any (array['adm', 'admin', 'aux_adm'])
    and autor_email = auth.email()
  );

create policy ocorrencias_diarias_delete on public.ocorrencias_diarias
  for delete using (meu_role() = any (array['adm', 'admin']));
