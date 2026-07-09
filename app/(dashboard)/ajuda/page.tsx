import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getAjudaConteudo } from "@/lib/ajudaConteudo";
import { AjudaMockup } from "@/components/ajuda-mockups";

export default async function AjudaPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let roleFinal: string | null = null;
  let contataFamiliaFinal = true;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, contata_familia")
    .eq("email", user.email)
    .maybeSingle();

  if (usuario) {
    roleFinal = usuario.role.toLowerCase();
    contataFamiliaFinal = usuario.contata_familia !== false;
  } else {
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

  if (!roleFinal) redirect("/login");

  const { roleLabel, intro, itens, contato } = getAjudaConteudo(roleFinal, contataFamiliaFinal);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Central de Ajuda</h1>
          <p className="text-xs text-slate-400 mt-0.5">Guia rápido — perfil {roleLabel}</p>
        </div>
        <span className="text-3xl">❓</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-sm text-slate-600">{intro}</p>
      </div>

      <div className="space-y-3">
        {itens.map((item, i) => (
          <details key={item.titulo} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden" open={i === 0}>
            <summary className="px-5 py-4 cursor-pointer flex items-center gap-3 font-semibold text-slate-800 text-sm hover:bg-slate-50 transition list-none">
              <span className="text-xl flex-shrink-0">{item.icone}</span>
              <span className="flex-1">{item.titulo}</span>
              <svg className="w-4 h-4 text-slate-400 transition-transform duration-200 group-open:rotate-180 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-5 pb-4 pt-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
              <AjudaMockup tipo={item.mockup} />
              <p className="whitespace-pre-line">{item.texto}</p>
              {item.reflexo && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                  <p className="font-semibold mb-1">👀 Reflexo</p>
                  <p>{item.reflexo}</p>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800">
        💡 {contato}
      </div>
    </div>
  );
}
