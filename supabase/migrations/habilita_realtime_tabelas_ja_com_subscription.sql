-- Várias telas já tinham código de subscription (postgres_changes) escrito
-- pra essas tabelas, mas o realtime do Supabase só transmite mudanças de
-- tabelas explicitamente adicionadas à publicação supabase_realtime — só
-- "notificacoes" estava habilitada. Isso significa que Chat (mensagens em
-- tempo real), Atendimentos ATs e Meus Comunicados/Comunicado Diário nunca
-- atualizavam sozinhos de verdade, mesmo com o código pronto — sempre
-- dependiam de recarregar a página manualmente.
alter publication supabase_realtime add table mensagens_chat;
alter publication supabase_realtime add table atendimentos;
alter publication supabase_realtime add table formularios_escolares;
