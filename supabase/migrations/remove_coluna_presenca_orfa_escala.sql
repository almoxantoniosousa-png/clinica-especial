-- Coluna presenca em escala/escala_historico era um mecanismo de marcar
-- presença (P/F/FJ) direto na tela geral de Escala, paralelo ao sistema
-- real (atendimentos_especialista, usado pela tela do próprio
-- especialista e lido por financeiro/folha de pagamento). Confirmado
-- zero uso real: 0 de 104 linhas em escala e 0 de 14 em escala_historico
-- com presenca preenchida. Código que lia/escrevia essa coluna já foi
-- removido de components/escala-manager.tsx.
alter table public.escala drop column if exists presenca;
alter table public.escala_historico drop column if exists presenca;
