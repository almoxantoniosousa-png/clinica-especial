-- Campo pedido pela Solange, reproduz pergunta do formulário antigo:
-- "Informa como foi o intervalo. Tem amizades com os colegas? Quais?"
alter table formularios_escolares add column if not exists amizades_intervalo text;
