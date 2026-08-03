-- A RLS de "conversas" (e outras tabelas) compara direto com auth.uid(),
-- não com usuarios.auth_id — então mesmo com auth_id certo, ela não
-- enxergava as próprias conversas porque usuarios.id (85f35bd9) é
-- diferente do auth.uid() dela (6dddf87d). Alinha o id de vez, do mesmo
-- jeito que já foi feito pra outras contas hoje.
do $$
declare
  old_id uuid := '85f35bd9-2f57-43e3-a654-16f9f8adeeb6';
  new_id uuid := '6dddf87d-57cf-4feb-9c48-1f9829a67f8c';
  email_real text;
begin
  select email into email_real from usuarios where id = old_id;

  -- libera auth_id e email no registro antigo (evita conflito de unicidade)
  update usuarios set auth_id = null, email = 'old-' || old_id::text || '-' || email_real where id = old_id;

  insert into usuarios (id, auth_id, nome, email, telefone, foto_url, role, ativo, created_at, cargo, contata_familia,
    cpf, rg, data_nascimento, endereco, cnpj, razao_social, data_demissao, motivo_saida, documentos, especialidade, registro_profissional)
  select new_id, new_id, nome, email_real, telefone, foto_url, role, ativo, created_at, cargo, contata_familia,
    cpf, rg, data_nascimento, endereco, cnpj, razao_social, data_demissao, motivo_saida, documentos, especialidade, registro_profissional
  from usuarios where id = old_id;

  update conversas set participante_a = new_id where participante_a = old_id;
  update conversas set participante_b = new_id where participante_b = old_id;
  update mensagens_chat set autor_id = new_id where autor_id = old_id;

  delete from usuarios where id = old_id;
end $$;
