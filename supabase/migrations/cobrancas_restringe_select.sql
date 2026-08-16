-- cobrancas_select_auth permitia QUALQUER usuário logado (familia, AT,
-- especialista etc.) ler os dados de cobrança de TODAS as famílias —
-- valor, status, vencimento. Restringindo a só ADM e Gestão, que são
-- quem de fato lida com esse dado hoje (só o dashboard da Gestão lê
-- essa tabela no sistema).
drop policy if exists "cobrancas_select_auth" on public.cobrancas;

create policy "cobrancas_select_adm_gestao"
  on public.cobrancas
  for select
  using (meu_role() = any (array['adm', 'admin', 'gestao']));
