-- Pedido do ADM: um espaço no sistema com links de leis que amparam a
-- atuação em psicologia e os direitos da criança especial. Mesmo padrão de
-- RLS de protocolos_conduta: qualquer autenticado lê, só ADM gerencia.
create table if not exists public.legislacao_apoio (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null,
  etiqueta text,
  link text not null,
  created_at timestamptz not null default now()
);

alter table public.legislacao_apoio enable row level security;

create policy legislacao_apoio_leitura on public.legislacao_apoio
  for select using (auth.uid() is not null);

create policy legislacao_apoio_gerenciar on public.legislacao_apoio
  for all using (meu_role() = 'adm' or meu_role() = 'admin');

insert into public.legislacao_apoio (titulo, descricao, etiqueta, link) values
  ('Lei nº 12.764/2012 — Lei Berenice Piana', 'Institui a Política Nacional de Proteção dos Direitos da Pessoa com Transtorno do Espectro Autista e reconhece a pessoa com autismo como pessoa com deficiência pra todos os efeitos legais.', 'Autismo', 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12764.htm'),
  ('Lei nº 13.146/2015 — Estatuto da Pessoa com Deficiência', 'Lei Brasileira de Inclusão (LBI). Garante direitos e igualdade de oportunidades às pessoas com deficiência.', 'Direitos', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm'),
  ('Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente', 'Dispõe sobre a proteção integral à criança e ao adolescente — base legal pra qualquer atendimento envolvendo menores de idade.', 'Criança', 'https://www.planalto.gov.br/ccivil_03/leis/l8069.htm'),
  ('Lei nº 13.709/2018 — LGPD', 'Lei Geral de Proteção de Dados Pessoais. Regula o uso, sigilo e direitos da família sobre os dados da criança atendida.', 'LGPD', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm'),
  ('Resolução CFP nº 06/2019', 'Institui regras sobre elaboração de documentos escritos produzidos pelo psicólogo no exercício profissional, incluindo prazos de guarda de prontuário.', 'Psicologia', 'https://site.cfp.org.br/wp-content/uploads/2019/09/Resolu%C3%A7%C3%A3o-CFP-n-06-2019-comentada.pdf');
