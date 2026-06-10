-- =============================================================================
-- FIX: política "usuarios_update" impedia algumas pessoas de salvar a própria
-- foto de perfil no chat (ex: Simone)
--
-- "usuarios_select"/"usuarios_update" só liberam o acesso à própria linha via
-- "auth_id = auth.uid()". Só que várias contas têm "usuarios.auth_id" nulo —
-- a conta foi criada a partir de "perfis", onde "perfis.id = auth.uid()" e o
-- mesmo id foi copiado para "usuarios"/"atendentes" sem preencher auth_id.
--
-- Resultado do bug: ao trocar a foto, o app faz
--   update usuarios set foto_url = ... where id = eu.id
-- Para quem tem auth_id preenchido (ou cujo "meu_role()" cai em adm/admin via
-- atendentes, caso da Solange) o update passa. Para quem não tem nenhum dos
-- dois (caso da Simone, role "gestao"), o RLS barra silenciosamente — 0 linhas
-- afetadas, sem erro, e a foto não persiste.
--
-- Adiciona "or id = auth.uid()" como alternativa em select/update: cobre as
-- contas cujo id em "usuarios" é o mesmo auth.uid() (originadas de "perfis"),
-- sem tirar nenhum acesso já existente.
--
-- Rodar no SQL Editor do Supabase. É idempotente (drop + create).
-- =============================================================================

drop policy if exists "usuarios_select" on public.usuarios;
drop policy if exists "usuarios_update" on public.usuarios;

create policy "usuarios_select" on public.usuarios
  for select using (
    public.meu_role() in ('adm', 'admin', 'gestao')
    or auth_id = auth.uid()
    or id = auth.uid()
  );

create policy "usuarios_update" on public.usuarios
  for update using (
    public.meu_role() in ('adm', 'admin')
    or auth_id = auth.uid()
    or id = auth.uid()
  );
