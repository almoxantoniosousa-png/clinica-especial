-- Gestão pediu pra tirar a funcionalidade de Brinquedos do sistema por
-- completo. Backup dos dados (2 brinquedos, 5 empréstimos) guardado fora
-- do repositório antes de remover, caso precise consultar depois.
drop table if exists brinquedos_emprestimos;
drop table if exists brinquedos;
