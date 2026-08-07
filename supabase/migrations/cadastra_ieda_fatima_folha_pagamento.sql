-- Ieda (limpeza) e Maria de Fátima dos Santos (aux_adm) não apareciam na Folha
-- de Pagamento porque essa tela só lista quem está em "atendentes", e
-- Apoio/Auxiliar Administrativo vivem em outras tabelas (colaboradoras_internas
-- e usuarios). folha_pagamento.profissional_id também tem FK travada em
-- atendentes(id), então não dá pra apontar pra outra tabela.
--
-- Solução: cada uma ganha também uma linha "de vínculo" em atendentes (role
-- apoio/aux_adm), só pra aparecer no seletor da folha. A tela de Colaboradores
-- já ignora essas roles ao consultar atendentes, então não duplica lá.
-- Executado via Supabase Management API.

-- Ieda: cadastro de Apoio já existe em colaboradoras_internas (Agente de Limpeza, sem login)
insert into atendentes (nome, email, role)
values ('Ieda', 'ieda.limpeza@abraco.com', 'apoio');

-- Fátima: já tinha login/cadastro em usuarios (role aux_adm) — reusa o mesmo id
insert into atendentes (id, nome, email, role)
values ('6dddf87d-57cf-4feb-9c48-1f9829a67f8c', 'Maria de Fátima dos Santos', 'ma.fa.santos1199@gmail.com', 'aux_adm');
