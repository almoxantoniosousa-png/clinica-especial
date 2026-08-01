-- Raquel Domingos (supervisora, usuarios, id fdbf206f) e Raquel Domingos
-- Estrela (atendente, atendentes, id 5847ebf2) são a mesma pessoa,
-- confirmado pela Solange. A escala tem FK pra atendentes.id, não dá pra
-- simplesmente repontar pra um id que só existe em usuarios — por isso a
-- identidade final fica em atendentes, usando o id que ela já usa pra
-- logar (fdbf206f, supervisoraraquel@gmail.com), com os dados completos
-- que já estavam no cadastro de AT (CPF, RG, nascimento, endereço, tel).
insert into atendentes (id, nome, email, role, cpf, rg, data_nascimento, endereco, whatsapp, ativo)
values (
  'fdbf206f-3dfa-41cb-aa31-0acb40963b80',
  'Raquel Domingos Estrela',
  'supervisoraraquel@gmail.com',
  'supervisora',
  '288.870.859-00',
  '982.278.152',
  '1989-06-21',
  'Rua Capitão Aristeu, Casa 96, Rio Vermelho, Salvador - BA',
  '71 98614-2633',
  true
);

update escala set profissional_id = 'fdbf206f-3dfa-41cb-aa31-0acb40963b80'
where profissional_id = '5847ebf2-32a6-4c56-96c3-71eafbeb8a5c';

delete from perfis where id = '5847ebf2-32a6-4c56-96c3-71eafbeb8a5c';
delete from atendentes where id = '5847ebf2-32a6-4c56-96c3-71eafbeb8a5c';

delete from perfis where id = 'fdbf206f-3dfa-41cb-aa31-0acb40963b80';
delete from usuarios where id = 'fdbf206f-3dfa-41cb-aa31-0acb40963b80';
