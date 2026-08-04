import { redirect } from "next/navigation";

// Duplicava a tela unificada /mural com menos recursos e um bug real: o
// insert usava a coluna `atendente_id`, que não existe na tabela `mural`
// (a coluna certa é `autor_id`) — publicar por aqui teria dado erro. Essa
// rota fica só de atalho pra quem tiver o link antigo salvo.
export default function GestaoMuralRedirect() {
  redirect("/mural");
}
