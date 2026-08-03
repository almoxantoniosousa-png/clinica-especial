-- Reverte o repontamento errado feito na migration anterior. O chat
-- identifica quem vem de "usuarios" pelo campo usuarios.id (não
-- auth_id/auth.uid()) — então as conversas/mensagens dela têm que voltar
-- a apontar pro id de sempre (85f35bd9), que é o que continua sendo
-- usuarios.id depois da correção de e-mail.
update conversas set participante_a = '85f35bd9-2f57-43e3-a654-16f9f8adeeb6' where participante_a = '6dddf87d-57cf-4feb-9c48-1f9829a67f8c';
update conversas set participante_b = '85f35bd9-2f57-43e3-a654-16f9f8adeeb6' where participante_b = '6dddf87d-57cf-4feb-9c48-1f9829a67f8c';
update mensagens_chat set autor_id = '85f35bd9-2f57-43e3-a654-16f9f8adeeb6' where autor_id = '6dddf87d-57cf-4feb-9c48-1f9829a67f8c';
