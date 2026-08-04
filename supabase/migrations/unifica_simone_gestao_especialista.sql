-- "Simone" (simone@abraco.com, role gestao, id f9c0cfd4) e "Simone Oliveira
-- Reis" (behav2008@hotmail.com, role especialista, id fd55d43e) eram a
-- mesma pessoa cadastrada duas vezes -- confirmado pela Solange. A conta
-- gestao é o login real (usada até hoje); a de especialista nunca teve
-- login, só guardava os dados profissionais (CPF, endereço, especialidade
-- Psicologia, registro 36936, foto) e 6 horários reais na escala.
-- Unificado no registro com login: copiados os dados profissionais e a
-- foto mais recente, repontada a escala, removido o registro sem login.
do $$
declare
  gestao_id uuid := 'f9c0cfd4-b3de-422a-ad3c-dfafbfba8246';
  esp_id uuid := 'fd55d43e-d0e1-43fa-9ffc-a1713367dbaa';
begin
  update atendentes set
    nome = 'Simone Oliveira Reis',
    especialidade = 'Psicologia',
    registro_profissional = '36936',
    cpf = '940.366.835-00',
    rg = '0516700383',
    data_nascimento = '1976-01-08',
    endereco = 'Rua Luis Eduardo Magalhaes 1081 Apart 604 bloco 1 Itapuan',
    whatsapp = '71992135213',
    logo_url = (select logo_url from atendentes where id = esp_id)
  where id = gestao_id;

  update usuarios set
    nome = 'Simone Oliveira Reis',
    cpf = '940.366.835-00',
    rg = '0516700383',
    data_nascimento = '1976-01-08',
    endereco = 'Rua Luis Eduardo Magalhaes 1081 Apart 604 bloco 1 Itapuan',
    telefone = '71992135213',
    especialidade = 'Psicologia',
    registro_profissional = '36936',
    foto_url = (select logo_url from atendentes where id = esp_id)
  where id = gestao_id;

  update escala set profissional_id = gestao_id, profissional_nome = 'Simone Oliveira Reis'
  where profissional_id = esp_id;

  delete from atendentes where id = esp_id;
end $$;
