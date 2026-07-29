-- Permite a supervisora marcar quais seções do Comunicado Diário precisam
-- de correção (ex: "Autonomia e Higiene", "Recreio e Socialização"), além
-- do texto livre já existente em correcao_texto.
alter table formularios_escolares add column if not exists correcao_topicos text[];
