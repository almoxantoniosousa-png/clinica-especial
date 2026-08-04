-- Card de "🎂 Aniversário" no Mural: marca o comunicado pra render
-- diferenciado (foto redonda tipo avatar, em vez do retângulo usado nos
-- outros comunicados com foto anexada).
alter table mural add column if not exists aniversario boolean not null default false;
