-- entrevistas_iniciais guarda nome, endereço, telefone, diagnóstico,
-- CPF do convênio e toda a entrevista médica/comportamental de cada
-- família — e tinha duas policies gravíssimas:
--   1) "publico_le_por_token": SELECT liberado pra "anon" com
--      qual=true — sem checar token nenhum, expunha a TABELA INTEIRA
--      pra qualquer visitante da internet via API direta.
--   2) "publico_responde_enquanto_aguardando": UPDATE pra "anon" só
--      checando status='aguardando' — também sem checar token, então
--      qualquer um podia sobrescrever a entrevista de QUALQUER família
--      ainda não respondida.
-- O acesso público por token agora passa só pelas Server Actions
-- (buscarEntrevistaPorToken/enviarEntrevistaPorToken em app/actions.ts),
-- que usam a service role e validam o token no servidor — não depende
-- mais de RLS pra isso, então as duas policies de "anon" saem.
drop policy if exists "publico_le_por_token" on public.entrevistas_iniciais;
drop policy if exists "publico_responde_enquanto_aguardando" on public.entrevistas_iniciais;

-- "equipe_acesso_total" também estava com qual/with_check = true pra
-- qualquer "authenticated" — isso inclui contas de família, que não
-- deveriam ver entrevista de ninguém. A pedido, restrito só à Gestão
-- (é quem de fato usa essa tela — /gestao/entrevista-inicial).
drop policy if exists "equipe_acesso_total" on public.entrevistas_iniciais;
drop policy if exists "gestao_acesso_total" on public.entrevistas_iniciais;
create policy "gestao_acesso_total"
  on public.entrevistas_iniciais
  for all
  using (meu_role() = 'gestao')
  with check (meu_role() = 'gestao');
