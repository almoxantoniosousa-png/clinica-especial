-- "Carolina Borges" (supervisoracarol@gmail.com) era conta de teste usada
-- antes de existir o cadastro real da Ana Carolina Borges Telles como
-- supervisora — confirmado pela Solange. Remove tudo: conversas/mensagens
-- de teste, o registro em perfis (legado) e o cadastro em usuarios.
delete from mensagens_chat where conversa_id in (
  select id from conversas where participante_a = '7323d537-e397-4a2a-9152-2784ae20a109' or participante_b = '7323d537-e397-4a2a-9152-2784ae20a109'
);
delete from conversas where participante_a = '7323d537-e397-4a2a-9152-2784ae20a109' or participante_b = '7323d537-e397-4a2a-9152-2784ae20a109';
delete from perfis where id = '7323d537-e397-4a2a-9152-2784ae20a109';
delete from usuarios where id = '7323d537-e397-4a2a-9152-2784ae20a109';
