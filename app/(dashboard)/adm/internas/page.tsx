import { redirect } from "next/navigation";

// Cadastro de Colaboradoras Internas ("Apoio") passou a ser a tela unificada
// /adm/colaboradores (seletor de categoria Especialista/Acompanhante/Apoio) —
// essa rota fica só de atalho pra quem ainda tiver o link antigo salvo.
export default function AdmInternasRedirect() {
  redirect("/adm/colaboradores");
}
