import { RoleSidebar } from "@/components/role-sidebar";
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

  const { data: atendentes, error } = await supabase
    .from("atendentes")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !atendentes) {
    console.log("Erro ao buscar atendentes:", error?.message);
    redirect("/login");
  }

  const roleFinal = atendentes.role.toLowerCase();
  console.log("ROLE FINAL:", roleFinal);

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* SIDEBAR — aparece em md+ e também renderiza a topbar mobile */}
      <RoleSidebar key={user.id} userRole={roleFinal} />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 min-w-0 min-h-screen overflow-y-auto bg-white">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}