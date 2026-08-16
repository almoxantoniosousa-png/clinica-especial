-- emprestimos_colaboradores e escala_administrativa estavam com RLS
-- totalmente desligado — qualquer usuário autenticado (AT, família,
-- especialista, qualquer um) conseguia ler/escrever livremente. A
-- primeira guarda CPF e valores de empréstimo de cada colaborador.

alter table public.emprestimos_colaboradores enable row level security;
create policy "financeiro_acesso"
  on public.emprestimos_colaboradores
  for all
  using (meu_role() = any (array['adm', 'admin', 'financeiro', 'aux_adm']));

alter table public.escala_administrativa enable row level security;
create policy "adm_acesso"
  on public.escala_administrativa
  for all
  using (meu_role() = any (array['adm', 'admin']));
