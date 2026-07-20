import { redirect } from "next/navigation";

// Escala Especialistas e Escala Acompanhantes foram unificadas numa única
// tela "Escala" (especialista + AT juntos, separados automaticamente na
// hora de imprimir/relatório). Rota mantida só pra não quebrar favoritos.
export default function EscalaEspecialistasRedirectPage() {
  redirect("/escala");
}
