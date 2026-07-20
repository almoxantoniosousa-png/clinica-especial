import { redirect } from "next/navigation";

// Rota antiga — mantida só pra não quebrar favoritos salvos.
export default function SupervisoraEscalaRedirectPage() {
  redirect("/escala");
}
