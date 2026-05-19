import { RoleSidebar } from "@/components/role-sidebar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  // 🔐 1. Verifica usuário
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 🔎 2. Busca perfil REAL
  const { data: atendentes, error } = await supabase
    .from("atendentes")
    .select("role")
    .eq("id", user.id)
    .single();

  // 🚨 Se der erro ou não encontrar perfil → bloqueia
  if (error || !atendentes) {
    console.log("Erro ao buscar atendentes:", error?.message);
    redirect("/login");
  }

  const roleFinal = atendentes.role.toLowerCase();
  console.log("ROLE FINAL:", roleFinal);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* MENU LATERAL DINÂMICO */}
      <div className="w-64 flex-shrink-0 hidden md:block">
        <RoleSidebar key={user.id} userRole={roleFinal} />
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto p-4 md:p-8 bg-white">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
