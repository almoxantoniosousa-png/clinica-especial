-- Os 10 primeiros registros de "atendimentos" da Bianca (status pendente,
-- 01/07 a 29/07/2026, criados todos de uma vez em 29/07) eram teste do
-- formulário de registro de horas/pagamento — confirmado pela Solange.
-- Zerava "Horas acumuladas" (51.83h) e "A receber" (R$1.261,60) no app.
-- Removidos via REST (service role) em 2026-08-03; migration só documenta.
delete from atendimentos where id in (
  '3d0aa5f9-6c2e-40e8-8f5b-3778e13ef0d7',
  '9f675354-a3d7-44af-8411-5658c46ced3f',
  '0048c4a7-70c1-4f57-a7eb-d8ec4614f8c3',
  '05350e1c-33c6-41ff-b8ee-8cda7a914b96',
  'b4696194-d6f1-4a10-9a5f-bd616d01499e',
  '6faa2ec7-0d8f-4e05-ba7b-c69322eb3c93',
  '775bbb07-5b84-4681-8d7b-90c94b8e107e',
  '9f9be4d9-c570-466d-8b68-fb304294b71b',
  'a9fa18d2-a446-48a0-bded-f700bdc4842f',
  '3167c15c-8337-4bfe-af77-1c3ea65a3cee'
);
