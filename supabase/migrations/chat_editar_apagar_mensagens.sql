-- =============================================================================
-- FEAT: permite editar e apagar mensagens do chat
--
-- O chat (app/(dashboard)/chat/page.tsx) ganhou a opção de o autor de uma
-- mensagem editá-la (somente texto) ou apagá-la (qualquer tipo, vira
-- "🚫 Mensagem apagada" para os dois lados da conversa).
--
-- Isso exige duas colunas novas em "mensagens_chat":
--   - editado : marca que o texto da mensagem foi alterado depois do envio
--   - apagada : marca que a mensagem foi apagada (o conteúdo deixa de ser
--               exibido, mas continua no banco)
--
-- A política "acesso_autenticado" da tabela é "for all using (auth.uid() is
-- not null)" — qualquer pessoa logada pode dar UPDATE em qualquer mensagem
-- (necessário hoje para reações, que qualquer participante pode adicionar).
-- Para que editar/apagar fiquem restritos a quem escreveu a mensagem, criamos
-- um trigger que bloqueia qualquer UPDATE que mude conteudo/apagada/editado
-- quando quem está logado não é o autor original (reações continuam livres,
-- pois só mexem na coluna "reacoes").
--
-- Rodar no SQL Editor do Supabase. É idempotente.
-- =============================================================================

alter table public.mensagens_chat
  add column if not exists editado boolean not null default false,
  add column if not exists apagada boolean not null default false;

create or replace function public.chat_restringe_edicao_mensagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.conteudo is distinct from old.conteudo
      or new.apagada  is distinct from old.apagada
      or new.editado  is distinct from old.editado)
     and old.autor_id is distinct from public.meu_usuario_id() then
    raise exception 'Você só pode editar ou apagar suas próprias mensagens.';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_restringe_edicao_mensagem on public.mensagens_chat;
create trigger chat_restringe_edicao_mensagem
  before update on public.mensagens_chat
  for each row execute function public.chat_restringe_edicao_mensagem();
