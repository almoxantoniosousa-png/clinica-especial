-- Bianca não tinha conta de login (não fazia parte do lote de 8 ATs criado
-- antes). Criei via Admin API com id novo (38e60d2a), diferente do
-- atendentes.id já existente (b6790ba8) — mesma situação do lote anterior.
-- Ela tem bastante histórico real (atendimentos, financeiro, chat,
-- materiais adaptados), então repontar com cuidado em vez de recriar do zero.
do $$
declare
  old_id uuid := 'b6790ba8-0052-4da2-8453-6767bf0b7294';
  new_id uuid := '38e60d2a-4306-4f80-9be8-fe86ef52740d';
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
  update conversas set participante_a = new_id where participante_a = old_id;
  update conversas set participante_b = new_id where participante_b = old_id;
  update mensagens_chat set autor_id = new_id where autor_id = old_id;
  update materiais_adaptados set criado_por = new_id where criado_por = old_id;

  delete from atendentes where id = old_id;
end $$;
