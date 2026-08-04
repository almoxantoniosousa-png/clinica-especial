import { redirect } from "next/navigation";

// Duplicava a tela unificada /mural com menos recursos (sem foto, sem
// destinatário "família") — o menu da Gestão apontava pra cá por engano,
// mas /adm não libera o role "gestao" no proxy (bloqueava o acesso dela).
// Essa rota fica só de atalho pra quem tiver o link antigo salvo.
export default function AdmMuralRedirect() {
  redirect("/mural");
}
