-- "atendente" (atendente@abraco.com) e "Atendente 2" (atendente2@abraco.com)
-- eram logins genéricos de teste, sem colaborador real associado (não
-- existem em `atendentes`) -- confirmado pela Solange, agora que os 8
-- acessos reais das ATs já estão funcionando. Removidas as mensagens/
-- conversa de teste da "Atendente 2", os cadastros em `usuarios` e os
-- logins (auth.users, via Admin API).
delete from mensagens_chat where conversa_id in (
  select id from conversas where participante_a = '779eb7cb-815a-4eba-bf13-f395daefdee8' or participante_b = '779eb7cb-815a-4eba-bf13-f395daefdee8'
);
delete from conversas where participante_a = '779eb7cb-815a-4eba-bf13-f395daefdee8' or participante_b = '779eb7cb-815a-4eba-bf13-f395daefdee8';
delete from usuarios where id in ('779eb7cb-815a-4eba-bf13-f395daefdee8', 'ab190989-7725-470b-95ba-5e26b2e1104c');
