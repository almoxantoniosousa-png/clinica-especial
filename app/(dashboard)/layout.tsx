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
  let cargoFinal: string | null = null;
  let contataFamiliaFinal = true;

  // 1. Busca na tabela usuarios (familia, gestao, adm, financeiro...)
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, cargo, contata_familia")
    .eq("email", user.email)
    .maybeSingle();

  if (usuario) {
    roleFinal = usuario.role.toLowerCase();
    cargoFinal = usuario.cargo || null;
    contataFamiliaFinal = usuario.contata_familia !== false;
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
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex flex-col md:flex-row min-h-screen">
        <RoleSidebar key={user.id} userRole={roleFinal} userCargo={cargoFinal} userContataFamilia={contataFamiliaFinal} />
        <main className="flex-1 min-w-0 min-h-screen overflow-y-auto overflow-x-hidden bg-zinc-100 relative">
          {/* Marca d'água — logo da clínica */}
          <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center" style={{ zIndex: 0 }}>
            <img src="/logo.png" alt="" aria-hidden="true"
              className="w-64 h-64 object-contain"
              style={{ opacity: 0.045, filter: "grayscale(100%)" }}
            />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8 h-full">
            {children}
          </div>
        </main>
      </div>
      <FloatingContact />
    </div>
  );
}