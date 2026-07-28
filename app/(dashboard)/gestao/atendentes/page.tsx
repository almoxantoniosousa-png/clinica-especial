import { redirect } from "next/navigation";

// Consulta de Acompanhantes passou a ser a tela unificada /gestao/colaboradores
// (Especialistas/Acompanhantes/Apoio juntos) — essa rota fica só de atalho
// pra quem ainda tiver o link antigo salvo.
export default function GestaoAtendentesRedirect() {
  redirect("/gestao/colaboradores");
}
