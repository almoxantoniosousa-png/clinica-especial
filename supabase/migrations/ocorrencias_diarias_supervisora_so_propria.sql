-- Ajuste pedido pelo Antonio: Supervisora só pode ver as ocorrências que ela
-- mesma registrou (não as de ADM/Aux. Administrativa, nem de outra
-- Supervisora). ADM e Aux. Administrativa continuam compartilhando a
-- visibilidade entre si, como já era. Gestão continua vendo tudo de todos.

alter policy ocorrencias_diarias_select on public.ocorrencias_diarias
  using (
    meu_role() = any (array['adm', 'admin', 'aux_adm', 'gestao'])
    or (meu_role() = 'supervisora' and autor_email = auth.email())
  );

alter policy ocorrencias_itens_select on public.ocorrencias_diarias_itens
  using (
    meu_role() = any (array['adm', 'admin', 'aux_adm', 'gestao'])
    or (
      meu_role() = 'supervisora'
      and exists (
        select 1 from public.ocorrencias_diarias o
        where o.id = ocorrencia_id and o.autor_email = auth.email()
      )
    )
  );
