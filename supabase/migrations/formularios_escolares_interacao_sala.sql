-- Campo pedido pela Solange: reproduz a pergunta do formulário antigo
-- ("Sala de aula: a criança/adolescente interage com o professor e colegas
-- de turma? Como? Durante a abordagem do conteúdo, o professor se
-- aproxima e orienta o/a estudante?") dentro do Comunicado Diário.
alter table formularios_escolares add column if not exists interacao_sala text;
