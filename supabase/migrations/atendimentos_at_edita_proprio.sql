-- ADM pediu que a AT consiga corrigir o próprio registro de atendimento
-- (data errada, horas erradas, criança errada etc.) sem poder excluir.
-- Só libera edição enquanto o pagamento ainda está pendente — depois de
-- pago, o registro fica travado pra não bagunçar o financeiro já fechado.
create policy "atendente_edita_proprio_atendimento_pendente"
  on public.atendimentos
  for update
  using (atendente_id = auth.uid() and status = 'pendente')
  with_check (atendente_id = auth.uid() and status = 'pendente');

-- A tabela financeiro não atualiza sozinha quando atendimentos muda (só
-- existe trigger de sync no INSERT). Sem isso, editar um atendimento
-- deixaria o Financeiro com valor/horas desatualizado.
create or replace function public.atualizar_financeiro_do_atendimento()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update financeiro set
    data = new.data,
    local = new.local,
    horas = coalesce(new.horas, 0),
    valor = coalesce(new.valor_hora, 0),
    valor_total = coalesce(new.valor_total, 0)
  where atendimento_id = new.id;
  return new;
end;
$$;

-- O WHEN é essencial: financeiro já tem um trigger reverso (financeiro_atendimento)
-- que copia status de volta pra atendimentos a cada UPDATE em financeiro, mesmo
-- sem mudança de valor. Sem essa condição, os dois triggers ficam se
-- retroalimentando (UPDATE atendimentos -> UPDATE financeiro -> UPDATE
-- atendimentos -> ...) até estourar "stack depth limit exceeded".
create trigger atendimento_financeiro_update
  after update on public.atendimentos
  for each row
  when (
    old.data is distinct from new.data or
    old.local is distinct from new.local or
    old.horas is distinct from new.horas or
    old.valor_hora is distinct from new.valor_hora or
    old.valor_total is distinct from new.valor_total
  )
  execute function public.atualizar_financeiro_do_atendimento();
