-- Ponto 6 (conversa com as ATs): supervisora acompanha a produção do
-- material adaptado ao vivo, sem esperar o envio final para revisão.
-- Sem isso a tabela nunca dispara eventos de realtime no client.
alter publication supabase_realtime add table materiais_adaptados;
