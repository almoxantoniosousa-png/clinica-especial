-- O login do Supabase Auth sempre guarda o e-mail em minúsculo, mas o
-- cadastro (atendentes/usuarios) pode ter sido digitado com maiúsculas.
-- Isso quebra toda busca de perfil por e-mail (.eq("email", user.email))
-- em dezenas de páginas do app — a pessoa loga certo mas o sistema não
-- acha o cadastro dela. Encontrado com a Raquel Santos de Santana
-- (Rachelamado@outlook.com), corrigido aqui pra minúsculo.
update atendentes set email = lower(email) where email <> lower(email);
update usuarios set email = lower(email) where email <> lower(email);
