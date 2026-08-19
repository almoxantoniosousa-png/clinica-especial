-- ADM pediu acesso de visualização (só leitura) da escala pro Aux. Administrativo.
alter policy escala_select_staff on escala
  using (meu_role() = any (array['adm', 'admin', 'gestao', 'supervisora', 'financeiro', 'aux_adm']));

alter policy escala_excecoes_select_staff on escala_excecoes
  using (meu_role() = any (array['adm', 'admin', 'gestao', 'supervisora', 'financeiro', 'aux_adm']));
