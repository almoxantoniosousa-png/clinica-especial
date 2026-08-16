-- CRÍTICO: usuarios_update e atendentes_update permitem que o próprio
-- usuário edite sua linha (auth_id = auth.uid() / email = auth.email()),
-- mas nenhuma das duas policies tem with_check restringindo a coluna
-- "role" — e o GRANT de UPDATE na coluna role está liberado pra
-- "authenticated". Ou seja: qualquer conta logada (inclusive família)
-- podia mandar PATCH direto na API e virar role='adm' na própria linha.
-- RLS não separa bem "pode editar seu nome mas não seu role" via
-- with_check simples, então a defesa correta é um trigger: bloqueia
-- qualquer troca de role feita por quem não é adm/admin.

create or replace function public.protege_role_contra_auto_promocao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and meu_role() not in ('adm', 'admin') then
    raise exception 'Você não tem permissão para alterar o campo role.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protege_role_usuarios on public.usuarios;
create trigger trg_protege_role_usuarios
  before update on public.usuarios
  for each row execute function public.protege_role_contra_auto_promocao();

drop trigger if exists trg_protege_role_atendentes on public.atendentes;
create trigger trg_protege_role_atendentes
  before update on public.atendentes
  for each row execute function public.protege_role_contra_auto_promocao();
