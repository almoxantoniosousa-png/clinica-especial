-- "Isangela de Seixas Pereira da Silva" (id c70fd151): ex-colaboradora mantida
-- só por causa de um empréstimo em emprestimos_colaboradores — essa tabela
-- não tem FK pra atendentes (guarda nome/CPF em texto livre), então excluir
-- daqui não afeta o controle do empréstimo.
delete from perfis where id = 'c70fd151-d72f-4f92-88af-fdda5423a98c';
delete from atendentes where id = 'c70fd151-d72f-4f92-88af-fdda5423a98c';

-- "Supervisora" (id 4af56b5f): conta genérica de teste, sem nome de pessoa
-- real. Tinha 2 conversas de 1 mensagem cada (teste) — remove tudo junto.
delete from mensagens_chat where conversa_id in (
  select id from conversas where participante_a = '4af56b5f-0a37-4ac0-8de5-6db67113275e' or participante_b = '4af56b5f-0a37-4ac0-8de5-6db67113275e'
);
delete from conversas where participante_a = '4af56b5f-0a37-4ac0-8de5-6db67113275e' or participante_b = '4af56b5f-0a37-4ac0-8de5-6db67113275e';
delete from perfis where id = '4af56b5f-0a37-4ac0-8de5-6db67113275e';
delete from atendentes where id = '4af56b5f-0a37-4ac0-8de5-6db67113275e';

-- "Pedagoga API (Temporário)" (id ebbf0b52, tabela usuarios): sem nenhuma
-- dependência — conta de teste/temporária.
delete from perfis where id = 'ebbf0b52-ffb7-40ed-ab44-bbaa29845fac';
delete from usuarios where id = 'ebbf0b52-ffb7-40ed-ab44-bbaa29845fac';
