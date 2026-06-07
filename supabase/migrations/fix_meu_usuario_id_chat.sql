-- =============================================================================
-- FIX: meu_usuario_id() bloqueava o envio de mensagens no chat
--
-- A versão anterior só procurava o id em "usuarios" (auth_id = auth.uid()).
-- Só que autor_id/participante_a/participante_b/usuario_id guardam o id da
-- conta de quem está logado — e essa conta pode estar em "perfis", em
-- "atendentes" OU em "usuarios", dependendo do cargo (é assim que o próprio
-- chat resolve "quem sou eu" em app/(dashboard)/chat/page.tsx).
--
-- Resultado do bug: para quem não tem linha em "usuarios" (especialistas, AT,
-- auxiliares etc.), a função retornava null, a política
-- "autor_id = meu_usuario_id()" nunca batia, e o INSERT em mensagens_chat
-- era recusado pelo RLS — a pessoa digitava e o envio simplesmente não ia.
--
-- Rodar no SQL Editor do Supabase. É idempotente (create or replace).
-- =============================================================================

create or replace function public.meu_usuario_id()
returns uuid language sql security definer stable
set search_path = public
as $$
  select coalesce(
    (select id from public.usuarios   where auth_id = auth.uid()),
    (select id from public.atendentes where email   = auth.email()),
    (select id from public.perfis     where id      = auth.uid())
  )
$$;
