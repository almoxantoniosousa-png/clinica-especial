-- Pedido do Antonio: ADM poder registrar adiantamentos/pagamentos parciais em
-- Contas a Pagar, abatendo do valor total do serviço/conta em vez de precisar
-- pagar tudo de uma vez (mesmo espírito do campo "adiantamento" da Folha de
-- Pagamento). valor continua sendo o valor total original da conta;
-- valor_pago acumula o que já foi pago. Restante = valor - valor_pago.
-- status passa a aceitar 'parcial' além de 'pendente'/'pago'.

alter table public.contas_pagar add column if not exists valor_pago numeric(10,2) not null default 0;
