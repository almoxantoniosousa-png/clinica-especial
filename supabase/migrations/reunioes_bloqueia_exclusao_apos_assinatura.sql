-- Depois que alguém assina/confirma uma ata, ela não pode mais ser excluída
-- pelo autor — só via suporte técnico direto no banco. Antes da primeira
-- assinatura, o autor continua podendo excluir normalmente (corrigir erro).
drop policy if exists reunioes_delete_autor on reunioes;

create policy reunioes_delete_autor on reunioes
  for delete
  using (
    criado_por_email = auth.email()
    and not exists (select 1 from reunioes_confirmacoes where reuniao_id = reunioes.id)
  );
