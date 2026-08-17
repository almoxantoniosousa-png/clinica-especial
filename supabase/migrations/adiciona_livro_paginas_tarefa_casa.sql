-- Tarefa de casa (Comunicado Diário) vira estruturada: Livro/Matéria,
-- Página(s) e Observação. tarefa_casa já existente (12 de 13 registros
-- preenchidos) vira o campo de Observação — sem perder histórico.
alter table public.formularios_escolares
  add column if not exists tarefa_livro text,
  add column if not exists tarefa_paginas text;
