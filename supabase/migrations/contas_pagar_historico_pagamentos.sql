-- Ajuste final pedido pelo Antonio: em vez de um único campo "adiantamento",
-- ele quer que cada pagamento feito ao prestador tenha sua própria data —
-- igual ao histórico de pagamentos já usado em Empréstimos de Colaboradores
-- (coluna jsonb `pagamentos`, cada entrada com valor + data). Substitui as
-- colunas adiantamento/desconto/valor_liquido (revertidas).

alter table public.contas_pagar drop column if exists valor_liquido;
alter table public.contas_pagar drop column if exists adiantamento;
alter table public.contas_pagar drop column if exists desconto;

alter table public.contas_pagar add column if not exists pagamentos jsonb not null default '[]'::jsonb;
