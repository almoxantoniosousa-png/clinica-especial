import { redirect } from "next/navigation";

// Rota antiga (escala combinada) — mantida só pra não quebrar favoritos
// salvos. A escala agora é dividida em duas telas.
export default function SupervisoraEscalaRedirectPage() {
  redirect("/supervisora/escala-especialistas");
}
