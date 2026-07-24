-- Ajuste pedido pelo Antonio: ADM e Aux. Administrativa NÃO devem ver os
-- registros feitos pela Supervisora (só os registros um do outro e os
-- próprios). Supervisora continua vendo só os dela. Gestão (Simone)
-- continua vendo tudo de todos. Para isso, precisamos saber o cargo de
-- quem criou o registro (autor_role), já que a política antiga liberava
-- ADM/Aux. Administrativa/Gestão para ver tudo sem distinção de autor.

alter table public.ocorrencias_diarias add column if not exists autor_role text;

update public.ocorrencias_diarias o
set autor_role = coalesce(
  (select u.role::text from public.usuarios u where u.email = o.autor_email limit 1),
  (select a.role::text from public.atendentes a where a.email = o.autor_email limit 1)
)
where autor_role is null;

alter policy ocorrencias_diarias_select on public.ocorrencias_diarias
  using (
    meu_role() = 'gestao'
    or (meu_role() = any (array['adm', 'admin', 'aux_adm']) and coalesce(autor_role, 'adm') <> 'supervisora')
    or (meu_role() = 'supervisora' and autor_email = auth.email())
  );

alter policy ocorrencias_itens_select on public.ocorrencias_diarias_itens
  using (
    meu_role() = 'gestao'
    or (
      meu_role() = any (array['adm', 'admin', 'aux_adm'])
      and exists (
        select 1 from public.ocorrencias_diarias o
        where o.id = ocorrencia_id and coalesce(o.autor_role, 'adm') <> 'supervisora'
      )
    )
    or (
      meu_role() = 'supervisora'
      and exists (
        select 1 from public.ocorrencias_diarias o
        where o.id = ocorrencia_id and o.autor_email = auth.email()
      )
    )
  );
