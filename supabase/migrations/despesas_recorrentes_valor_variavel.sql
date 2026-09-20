-- Pedido: contas como energia/água variam de valor todo mês, mas o sistema
-- estava copiando sempre o mesmo valor fixo do cadastro da recorrente.
-- Agora a ADM pode marcar uma recorrente como "valor variável" — a conta
-- gerada automaticamente nasce sinalizada pra confirmação, em vez de assumir
-- que o valor do mês passado se repete.

alter table public.despesas_recorrentes
  add column if not exists valor_variavel boolean not null default false;

alter table public.contas_pagar
  add column if not exists valor_confirmado boolean not null default true;

comment on column public.despesas_recorrentes.valor_variavel is 'Quando true, a conta gerada automaticamente nasce com valor_confirmado=false, pedindo pro usuário digitar o valor real da fatura daquele mês.';
comment on column public.contas_pagar.valor_confirmado is 'false = valor ainda é um placeholder (veio de uma recorrente de valor variável) e precisa ser confirmado/editado antes de considerar correto.';
