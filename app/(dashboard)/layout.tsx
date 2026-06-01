import { RoleSidebar } from "@/components/role-sidebar";
import { FloatingContact } from "@/components/floating-contact";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let roleFinal = null;

  // 1. Busca na tabela usuarios (familia, gestao, adm, financeiro...)
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();

  if (usuario) {
    roleFinal = usuario.role.toLowerCase();
  } else {
    // 2. Busca na tabela atendentes (ATs e especialistas)
    const { data: porId } = await supabase
      .from("atendentes")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (porId) {
      roleFinal = porId.role.toLowerCase();
    } else {
      const { data: porEmail } = await supabase
        .from("atendentes")
        .select("role")
        .eq("email", user.email)
        .maybeSingle();

      if (porEmail) roleFinal = porEmail.role.toLowerCase();
    }
  }

  if (!roleFinal) {
    console.log("Usuário não encontrado em nenhuma tabela:", user.email);
    redirect("/login");
  }

  console.log("ROLE FINAL:", roleFinal);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <RoleSidebar key={user.id} userRole={roleFinal} />
        <main className="flex-1 min-w-0 min-h-screen overflow-y-auto overflow-x-hidden bg-white">
          <div className="max-w-5xl mx-auto p-4 md:p-8 h-full">
            {children}
          </div>
        </main>
      </div>
      <FloatingContact />
    </div>
  );
}