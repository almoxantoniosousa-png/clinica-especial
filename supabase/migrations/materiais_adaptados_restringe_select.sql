-- materiais_adaptados_select estava com qual = auth.uid() IS NOT NULL —
-- qualquer conta logada, inclusive família, conseguia ler a tabela
-- inteira via chamada direta à API. Mas a tela (/materiais-adaptados)
-- só aparece no menu de papéis de equipe (adm, gestão, supervisora,
-- especialista, AT com faz_adaptado) — família nunca teve acesso a essa
-- funcionalidade, então o correto não é escopar por crianca_id, é
-- excluir família por completo, igual ao padrão já usado nos buckets
-- de storage de ocorrências/plano terapêutico.
drop policy if exists "materiais_adaptados_select" on public.materiais_adaptados;

create policy "materiais_adaptados_select"
  on public.materiais_adaptados
  for select
  using (meu_role() <> 'familia' and meu_role() <> '');
