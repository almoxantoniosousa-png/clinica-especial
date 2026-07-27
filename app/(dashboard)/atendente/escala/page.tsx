import { redirect } from "next/navigation";

// "Minha Escala" do AT passou a ser a tela unificada /escala (aba Calendário
// já filtrada pros próprios atendimentos) — essa rota fica só de atalho pra
// quem ainda tiver o link antigo salvo.
export default function AtendenteEscalaRedirect() {
  redirect("/escala");
}
