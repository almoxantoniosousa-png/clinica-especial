import { RoleSidebar } from "@/components/role-sidebar";
import { FloatingContact } from "@/components/floating-contact";
import { LembretesAgendaPessoal } from "@/components/lembretes-agenda-pessoal";
import { GravacaoProvider } from "@/contexts/gravacao-context";
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
  let nomeFinal: string | null = null;
  let contataFamiliaFinal = true;
  let fazAdaptadoFinal = false;

  // 1. Busca na tabela usuarios (familia, gestao, adm, financeiro...)
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, cargo, nome, contata_familia")
    .eq("email", user.email)
    .maybeSingle();

  if (usuario) {
    roleFinal = usuario.role.toLowerCase();
    cargoFinal = usuario.cargo || null;
    nomeFinal = usuario.nome || null;
    contataFamiliaFinal = usuario.contata_familia !== false;
  } else {
    // 2. Busca na tabela atendentes (ATs e especialistas)
    const { data: porId } = await supabase
      .from("atendentes")
      .select("role, nome, faz_adaptado")
      .eq("id", user.id)
      .maybeSingle();

    if (porId) {
      roleFinal = porId.role.toLowerCase();
      nomeFinal = porId.nome || null;
      fazAdaptadoFinal = !!porId.faz_adaptado;
    } else {
      const { data: porEmail } = await supabase
        .from("atendentes")
        .select("role, nome, faz_adaptado")
        .eq("email", user.email)
        .maybeSingle();

      if (porEmail) {
        roleFinal = porEmail.role.toLowerCase();
        nomeFinal = porEmail.nome || null;
        fazAdaptadoFinal = !!porEmail.faz_adaptado;
      }
    }
  }

  if (!roleFinal) {
    redirect("/login");
  }

  // Todos os perfis usam menu horizontal no topo mesmo no desktop — por
  // isso o wrapper fica flex-col sempre, em vez de virar flex-row a partir
  // do md (sidebar vertical, agora sem uso em nenhum perfil).
  const isAtendenteRole = !["adm", "admin", "supervisora", "gestao", "especialista", "familia", "aux_adm", "financeiro"].includes(roleFinal);
  const isAdminRole = roleFinal === "adm" || roleFinal === "admin";
  const isSupervisoraRole = roleFinal === "supervisora";
  const isAuxAdmRole = roleFinal === "aux_adm";
  const isGestaoRole = roleFinal === "gestao";
  const isEspecialistaRole = roleFinal === "especialista";
  const isFamiliaRole = roleFinal === "familia";
  const usaMenuHorizontal = isAtendenteRole || isAdminRole || isSupervisoraRole || isAuxAdmRole || isGestaoRole || isEspecialistaRole || isFamiliaRole;

  return (
    <GravacaoProvider>
      <div className="min-h-screen bg-slate-50">
        <div className={`flex flex-col min-h-screen ${usaMenuHorizontal ? "" : "md:flex-row"}`}>
          <RoleSidebar key={user.id} userRole={roleFinal} userCargo={cargoFinal} userNome={nomeFinal} userContataFamilia={contataFamiliaFinal} userFazAdaptado={fazAdaptadoFinal} />
          <main className="flex-1 min-w-0 min-h-screen overflow-y-auto overflow-x-hidden bg-zinc-200 relative">
            {/* Marca d'água — logo da clínica */}
            <div className="fixed inset-0 pointer-events-none select-none flex items-center justify-center" style={{ zIndex: 0 }}>
              <img src="/logo.png" alt="" aria-hidden="true"
                className="w-64 h-64 object-contain"
                style={{ opacity: 0.08, filter: "grayscale(100%)" }}
              />
            </div>
            <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8 h-full">
              {children}
            </div>
          </main>
        </div>
        <FloatingContact />
        {(roleFinal === "adm" || roleFinal === "admin") && <LembretesAgendaPessoal email={user.email || ""} />}
      </div>
    </GravacaoProvider>
  );
}