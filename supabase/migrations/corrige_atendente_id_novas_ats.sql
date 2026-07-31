-- As 8 contas de login criadas hoje (via Admin API) geraram um id de
-- auth.users novo, diferente do atendentes.id já existente (a convenção
-- do sistema é atendentes.id = auth.users.id, usada em várias policies
-- de RLS com "atendentes.id = auth.uid()"). Sem isso corrigido, essas
-- ATs conseguem logar e o nome aparece certo (isso usa email), mas
-- qualquer permissão baseada em id (ex: faz_adaptado) fica quebrada —
-- pegou a Marivania, uma das 3 autorizadas a fazer adaptado.
--
-- Corrige: libera o e-mail no registro antigo, cria uma cópia com o id
-- novo, reponta quem referenciava o id antigo, e remove o registro
-- antigo. Bianca já estava correta (não entra na lista).

do $$
declare
  pares uuid[][] := array[
    array['5db2b821-fa86-4c47-8f4f-5ecd5e7861d7', '1f662440-f516-4e41-8bdd-86f078741fd3']::uuid[], -- Ana Carolina
    array['b8cf2762-9ef4-4447-a1be-772a5a6ab782', 'd223aae1-7ce4-4d87-bef0-29bbbfdbb977']::uuid[], -- Ana Paula
    array['dce6ea09-e52d-4275-b888-d89e02ee022e', 'b357e1b5-19f3-4ad4-8a65-37d23cc395a1']::uuid[], -- Eliane
    array['600aafed-046c-4cc0-ac6b-d4174f8ccfe4', '41be98eb-e213-41c5-96a8-6d966af10b41']::uuid[], -- Lisvana
    array['3d6bd4b9-d466-4f9d-8b62-8a8ac2791ed6', '8c3ec734-26b9-483f-bbe5-aa83738eed6e']::uuid[], -- Marivania
    array['2e102f9e-911c-4d5b-b093-3a46bc1f15b6', '5847ebf2-32a6-4c56-96c3-71eafbeb8a5c']::uuid[], -- Raquel Domingos
    array['efd686c9-c945-4b5c-9d64-89ac9c0de292', '3fe7dae6-8a06-4f16-8a86-07d55e0505d0']::uuid[], -- Raquel Santos
    array['e236422c-e300-4b2c-aa90-f8fae1365682', 'f2f0fba1-06e8-4076-8533-0b20acc28e20']::uuid[]  -- Vera Lúcia
  ];
  par uuid[];
  old_id uuid;
  new_id uuid;
  email_real text;
begin
  foreach par slice 1 in array pares loop
    old_id := par[1];
    new_id := par[2];

    select email into email_real from atendentes where id = old_id;

    -- libera o e-mail no registro antigo (evita conflito de unicidade)
    update atendentes set email = 'old-' || old_id::text || '-' || email_real where id = old_id;

    -- cópia com o id novo e o e-mail real
    insert into atendentes (
      id, email, nome, role, logo_url, created_at, whatsapp, especialidade,
      conselho, pix_key, registro_profissional, cpf, rg, data_nascimento,
      endereco, usuario_id, cnpj, razao_social, data_demissao, motivo_saida,
      ativo, documentos, faz_adaptado
    )
    select
      new_id, email_real, nome, role, logo_url, created_at, whatsapp, especialidade,
      conselho, pix_key, registro_profissional, cpf, rg, data_nascimento,
      endereco, usuario_id, cnpj, razao_social, data_demissao, motivo_saida,
      ativo, documentos, faz_adaptado
    from atendentes where id = old_id;

    -- reponta quem referenciava o id antigo
    update escala set profissional_id = new_id where profissional_id = old_id;
    update atendimentos set atendente_id = new_id where atendente_id = old_id;
    update mural set autor_id = new_id where autor_id = old_id;
    update financeiro set atendente_id = new_id where atendente_id = old_id;
    update folha_pagamento set profissional_id = new_id where profissional_id = old_id;
    update portal_momentos set autor_id = new_id where autor_id = old_id;
    update portal_evolucao set autor_id = new_id where autor_id = old_id;
    update portal_comunicados set autor_id = new_id where autor_id = old_id;
    update atendimentos_especialista set especialista_id = new_id where especialista_id = old_id;
    update agenda set especialista_id = new_id where especialista_id = old_id;
    update escala_excecoes set profissional_id = new_id where profissional_id = old_id;

    -- remove o registro antigo (sem mais nada referenciando)
    delete from atendentes where id = old_id;
  end loop;
end $$;
