import { redirect } from "next/navigation";

// Consulta de Colaboradoras Internas ("Apoio") passou a ser a tela unificada
// /gestao/colaboradores (Especialistas/Acompanhantes/Apoio juntos) — essa
// rota fica só de atalho pra quem ainda tiver o link antigo salvo.
export default function GestaoInternasRedirect() {
  redirect("/gestao/colaboradores");
}
