-- Ponto 4 (conversa com as ATs): nem toda criança tem livro adaptado — em
-- vez de fixar os 6 nomes no código, um campo configurável que o ADM
-- controla no cadastro da criança (mesmo padrão do faz_adaptado das ATs).
alter table criancas add column if not exists livro_adaptado boolean not null default false;

update criancas set livro_adaptado = true
where nome in (
  'Mel Chagas Sampaio Chaves de Farias',
  'Caroline Santana Chiacchio Oliveira',
  'Gabriel Barbosa Correia',
  'Mª Isabella dos Santos Fragoso Vieira Lima',
  'Tiago Rego de Castro',
  'Álvaro Costa Fernandes'
);
