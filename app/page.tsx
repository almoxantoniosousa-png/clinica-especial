import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

// Destino de quem já está logado e cai em "/" — acontece depois de trocar a
// senha (primeiro acesso ou "esqueci minha senha"). Mesmos portais do login.
const HOME_POR_ROLE: Record<string, string> = {
  adm: "/adm/dashboard",
  admin: "/adm/dashboard",
  gestao: "/gestao/dashboard",
  supervisora: "/supervisora/inicio",
  especialista: "/especialista/inicio",
  familia: "/familia",
  financeiro: "/adm/financeiro",
  atendente: "/atendente/dashboard",
  at: "/atendente/dashboard",
  aux_adm: "/auxiliar/inicio",
  apoio: "/apoio/materiais",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const emailBusca = user.email.trim().toLowerCase().replace(/[%_\\]/g, (c) => "\\" + c);
  const { data: usuario } = await supabase.from("usuarios").select("role").ilike("email", emailBusca).maybeSingle();
  let role = (usuario?.role || "").toString().trim().toLowerCase();
  if (!role) {
    const { data: atendente } = await supabase.from("atendentes").select("role").ilike("email", emailBusca).maybeSingle();
    role = (atendente?.role || "").toString().trim().toLowerCase();
  }

  redirect(HOME_POR_ROLE[role] || "/login");
}
