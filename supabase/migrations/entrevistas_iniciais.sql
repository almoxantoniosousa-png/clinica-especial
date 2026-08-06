-- Entrevista Inicial digital: quando uma família liga pra clínica, a Simone
-- gera um link único (token) e manda por WhatsApp. Os pais preenchem sem
-- precisar de login (papel de "anon" no Supabase) -- por isso a tabela tem
-- políticas próprias, diferentes do resto do sistema: a equipe autenticada
-- tem acesso total, e o público só enxerga/atualiza a própria linha (o
-- token no link é a única "senha", como um link do Google Docs) e só
-- enquanto o status ainda é 'aguardando' -- depois de responder, não dá
-- mais pra editar.
--
-- Fazer a entrevista não significa iniciar tratamento -- por isso essa
-- tabela é independente de `criancas`; a Simone decide manualmente quando
-- (e se) uma família vira paciente de verdade.
create table if not exists entrevistas_iniciais (
  id uuid primary key default gen_random_uuid(),
  token uuid unique not null default gen_random_uuid(),
  status text not null default 'aguardando', -- aguardando | respondido | paciente | nao_seguiu
  criado_por_email text,
  criado_por_nome text,
  nome_crianca_preenchido text,
  contato_telefone text,
  contato_email text,
  created_at timestamptz not null default now(),
  respondido_em timestamptz,

  nome_crianca text,
  idade text,
  data_nascimento date,
  local text,
  nome_pais text,
  endereco text,
  telefone text,
  email text,
  como_soube text,
  como_soube_outro text,
  alergia text,
  alergia_obs text,

  diagnostico text,
  gestacao text,
  parto text,
  primeiros_meses text,
  acompanhamento_atual text,
  medicacoes jsonb default '[]',
  terapias_anteriores text,

  queixa text,
  relato_escola text,
  aprendizado_academico text,
  leitura text,
  motora_fina text,
  motora_ampla text,
  atencao text,
  habilidade_social text,

  escola_nome text,
  escola_telefone text,
  escola_professora text,
  escola_local text,
  escola_obs text,
  dias_semana_escola text,
  horas_dia_escola text,
  servicos_recebidos jsonb default '[]',
  outros_servicos jsonb default '[]',
  contatos_outros_prestadores text,

  pessoas_casa text,
  pais_separados text,
  guarda text,
  frequencia_outro_pai text,
  qtd_amigos text,
  horas_amigos_fora_escola text,
  atividade_extracurricular text,

  como_comunica text,
  facilidade_comunicacao text,
  necessidade_sensorial text,
  brinca_independente text,
  comportamento_social_adequado text,

  capaz_brincar_fisicamente text,
  capaz_atividades_dia_a_dia text,
  usa_banheiro_sozinho text,
  habilidade_comer text,
  habilidades_seguranca text,

  problemas_comportamento text,
  duracao_comportamento text,
  pontos_fortes text,
  pontos_fracos text,
  objetivos_aba text,

  reforcadores text,
  rotina_sono text,
  disponibilidade_familia text,
  consentimento_lgpd boolean default false,
  consentimento_imagem boolean default false,
  responsavel_preencheu text,

  observacoes_simone text
);

alter table entrevistas_iniciais enable row level security;

create policy "equipe_acesso_total" on entrevistas_iniciais for all
  to authenticated
  using (true) with check (true);

create policy "publico_le_por_token" on entrevistas_iniciais for select
  to anon
  using (true);

create policy "publico_responde_enquanto_aguardando" on entrevistas_iniciais for update
  to anon
  using (status = 'aguardando')
  with check (status = 'respondido');
