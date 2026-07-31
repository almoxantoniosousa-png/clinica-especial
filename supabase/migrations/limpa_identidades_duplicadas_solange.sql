-- Corrige a bagunça de identidades duplicadas da Solange no Chat.
-- A conta ativa e usada hoje é solange.rsun@gmail.com (id ca4d2a85), role adm.

-- "Diretora" (solange.rsun@gmail.com, id 2c6749cb, role gestao) era um cadastro
-- duplicado sem nenhuma conversa/mensagem associada. Remove primeiro da perfis
-- (senão conflita com o e-mail correto que vai para ca4d2a85 abaixo, por causa
-- da trigger que espelha atendentes -> perfis).
delete from perfis where id = '2c6749cb-5a6a-43af-932e-9df26aeb5437';
delete from atendentes where id = '2c6749cb-5a6a-43af-932e-9df26aeb5437';
delete from usuarios where id = '2c6749cb-5a6a-43af-932e-9df26aeb5437';

-- O e-mail em atendentes tinha um erro de digitação (srun em vez de rsun).
update atendentes set email = 'solange.rsun@gmail.com' where id = 'ca4d2a85-8eed-4ef5-bf52-642482cbe24d';

-- "Administrador" (adm@abraco.com, id d914400d) é uma conta antiga duplicada.
-- Não foi excluída pois tem 5 conversas / 12 mensagens reais no chat com outras
-- pessoas — excluir apagaria esse histórico. Em vez disso, desativa (não loga
-- mais, some da lista de contatos), preservando o histórico existente.
update atendentes set ativo = false where id = 'd914400d-f727-4b06-a03b-1637d89b0a6a';
update usuarios set ativo = false where id = 'd914400d-f727-4b06-a03b-1637d89b0a6a';

-- "Solange Reis" / "Sol Teste" (sol@abraco.com, id c6aa4396) é conta de teste
-- antiga, sem nenhuma conversa/mensagem associada — exclui direto.
delete from usuarios where id = 'c6aa4396-1daa-4f5b-b9c6-05b32763811f';
delete from perfis where id = 'c6aa4396-1daa-4f5b-b9c6-05b32763811f';
