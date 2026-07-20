import { redirect } from "next/navigation";

// Página antiga (escala combinada, sem presença/motivo/histórico) —
// mantida só pra não quebrar favoritos salvos. Substituída pelas duas
// telas novas.
export default function EscalaRedirectPage() {
  redirect("/escala-especialistas");
}
