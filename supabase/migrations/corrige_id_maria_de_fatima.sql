-- Maria de Fátima (Aux. Administrativo) tinha atendentes.id diferente do
-- id de login real (auxadm@abraco.com) — mesmo bug de id desalinhado já
-- corrigido pra outras pessoas hoje. meu_role() ainda funcionava (cai no
-- fallback por e-mail), mas deixava a conta inconsistente pra qualquer
-- feature futura que dependa do id bater com auth.uid().
do $$
declare
  old_id uuid := '85f35bd9-2f57-43e3-a654-16f9f8adeeb6';
  new_id uuid := '6dddf87d-57cf-4feb-9c48-1f9829a67f8c';
  email_real text;
begin
  select email into email_real from atendentes where id = old_id;

  update atendentes set email = 'old-' || old_id::text || '-' || email_real where id = old_id;

  insert into atendentes (
    id, email, nome, role, logo_url, created_at, whatsapp, especialidade,
    conselho, pix_key, registro_profissional, cpf, rg, data_nascimento,
    endereco, usuario_id, cnpj, razao_social, data_demissao, motivo_saida,
    ativo, documentos, faz_adaptado, cargo
  )
  select
    new_id, email_real, nome, role, logo_url, created_at, whatsapp, especialidade,
    conselho, pix_key, registro_profissional, cpf, rg, data_nascimento,
    endereco, usuario_id, cnpj, razao_social, data_demissao, motivo_saida,
    ativo, documentos, faz_adaptado, cargo
  from atendentes where id = old_id;

  update conversas set participante_a = new_id where participante_a = old_id;
  update conversas set participante_b = new_id where participante_b = old_id;
  update mensagens_chat set autor_id = new_id where autor_id = old_id;

  delete from perfis where id = old_id;
  delete from atendentes where id = old_id;
end $$;
