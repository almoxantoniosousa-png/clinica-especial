-- O registro dela é na tabela "usuarios" (não "atendentes" — a migration
-- corrige_id_maria_de_fatima.sql mirou a tabela errada e não teve efeito
-- nessa parte). "usuarios" já tem um campo auth_id separado do id, então
-- não precisava de correção de id — só trocar o e-mail de teste
-- (auxadm@abraco.com) pelo e-mail real dela.
update usuarios set email = 'ma.fa.santos1199@gmail.com' where id = '85f35bd9-2f57-43e3-a654-16f9f8adeeb6';
