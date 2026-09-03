-- Um protocolo passa a poder valer para vários cargos ao mesmo tempo, em
-- vez de exigir um cadastro (e um upload de anexo) separado por cargo
-- quando o mesmo protocolo se aplica a mais de um. Pedido pela Solange.
alter table public.protocolos_conduta add column cargos text[];
update public.protocolos_conduta set cargos = array[cargo] where cargos is null;
alter table public.protocolos_conduta alter column cargos set not null;
alter table public.protocolos_conduta alter column cargos set default '{}';
alter table public.protocolos_conduta drop column cargo;
