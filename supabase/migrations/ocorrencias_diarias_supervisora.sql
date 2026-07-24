-- Supervisoras sugeriram e a direção aceitou: elas também passam a criar e
-- assinar Ocorrência Diária, igual ADM e Aux. Administrativa já faziam.
-- Exclusão total (dia já assinado) continua restrita a ADM.

alter policy ocorrencias_diarias_select on public.ocorrencias_diarias
  using (meu_role() = any (array['adm', 'admin', 'aux_adm', 'gestao', 'supervisora']));

alter policy ocorrencias_diarias_insert on public.ocorrencias_diarias
  with check (
    meu_role() = any (array['adm', 'admin', 'aux_adm', 'supervisora'])
    and autor_email = auth.email()
  );

alter policy ocorrencias_diarias_update on public.ocorrencias_diarias
  using (
    meu_role() = any (array['adm', 'admin', 'aux_adm', 'supervisora'])
    and autor_email = auth.email()
    and assinado_em is null
  )
  with check (
    meu_role() = any (array['adm', 'admin', 'aux_adm', 'supervisora'])
    and autor_email = auth.email()
  );

alter policy ocorrencias_diarias_delete on public.ocorrencias_diarias
  using (
    meu_role() = any (array['adm', 'admin'])
    or (
      meu_role() = any (array['adm', 'admin', 'aux_adm', 'supervisora'])
      and autor_email = auth.email()
      and assinado_em is null
    )
  );

alter policy ocorrencias_itens_select on public.ocorrencias_diarias_itens
  using (meu_role() = any (array['adm', 'admin', 'aux_adm', 'gestao', 'supervisora']));

alter policy ocorrencias_itens_insert on public.ocorrencias_diarias_itens
  with check (
    meu_role() = any (array['adm', 'admin', 'aux_adm', 'supervisora'])
    and exists (
      select 1 from public.ocorrencias_diarias o
      where o.id = ocorrencia_id
        and o.autor_email = auth.email()
        and o.assinado_em is null
    )
  );

alter policy ocorrencias_itens_update on public.ocorrencias_diarias_itens
  using (
    meu_role() = any (array['adm', 'admin', 'aux_adm', 'supervisora'])
    and exists (
      select 1 from public.ocorrencias_diarias o
      where o.id = ocorrencia_id
        and o.autor_email = auth.email()
        and o.assinado_em is null
    )
  );

alter policy ocorrencias_itens_delete on public.ocorrencias_diarias_itens
  using (
    meu_role() = any (array['adm', 'admin'])
    or (
      meu_role() = any (array['adm', 'admin', 'aux_adm', 'supervisora'])
      and exists (
        select 1 from public.ocorrencias_diarias o
        where o.id = ocorrencia_id
          and o.autor_email = auth.email()
          and o.assinado_em is null
      )
    )
  );

alter policy ocorrencias_fotos_insert on storage.objects
  with check (bucket_id = 'ocorrencias-fotos' and meu_role() = any (array['adm', 'admin', 'aux_adm', 'supervisora']));
