-- Ajuste pedido pela Solange (ADM): ao invés de um fluxo de pagamento em
-- várias parcelas com histórico corrido, ela quer o mesmo modelo já usado na
-- Folha de Pagamento — editar a conta ANTES de pagar, informando um
-- adiantamento/desconto que abate do valor total (valor_base), calculando um
-- valor líquido a pagar. Substitui a tentativa anterior baseada em
-- valor_pago/status 'parcial' (revertida).

alter table public.contas_pagar drop column if exists valor_pago;

alter table public.contas_pagar add column if not exists adiantamento numeric(10,2) not null default 0;
alter table public.contas_pagar add column if not exists desconto numeric(10,2) not null default 0;
alter table public.contas_pagar add column if not exists valor_liquido numeric(10,2)
  generated always as (valor - adiantamento - desconto) stored;
