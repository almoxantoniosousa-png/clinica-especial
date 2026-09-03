import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { linkSuporteTecnico, formatarSuporteTecnicoWhatsApp } from "@/lib/suporteTecnico";
import { rotuloRole } from "@/lib/roles";

export default async function SuporteTecnicoPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let roleFinal: string | null = null;
  let nomeFinal: string | null = null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("role, nome")
    .eq("email", user.email)
    .maybeSingle();

  if (usuario) {
    roleFinal = usuario.role.toLowerCase();
    nomeFinal = usuario.nome || null;
  } else {
    const { data: porId } = await supabase
      .from("atendentes")
      .select("role, nome")
      .eq("id", user.id)
      .maybeSingle();

    if (porId) {
      roleFinal = porId.role.toLowerCase();
      nomeFinal = porId.nome || null;
    } else {
      const { data: porEmail } = await supabase
        .from("atendentes")
        .select("role, nome")
        .eq("email", user.email)
        .maybeSingle();

      if (porEmail) {
        roleFinal = porEmail.role.toLowerCase();
        nomeFinal = porEmail.nome || null;
      }
    }
  }

  const cargo = rotuloRole(roleFinal);
  const quem = [nomeFinal, cargo].filter(Boolean).join(" — ");
  const textoWhatsApp = `Olá! Preciso de ajuda no sistema.${quem ? `\n${quem}` : ""}`;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Suporte Técnico</h1>
          <p className="text-xs text-slate-400 mt-0.5">Fale direto com quem cuida do sistema</p>
        </div>
        <span className="text-3xl">🛟</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-sm text-slate-600">
          Encontrou algum problema no sistema, uma tela que não funcionou como esperado, ou precisa de ajuda pra usar
          alguma funcionalidade? Chame no WhatsApp abaixo — conte o que aconteceu e, se puder, em qual tela estava.
          Isso ajuda a resolver mais rápido.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.302-1.506A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.189-1.427l-.371-.221-3.742.894.939-3.648-.242-.384A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">Suporte técnico — Antonio 🙂</p>
          <p className="text-xs text-slate-400">WhatsApp: {formatarSuporteTecnicoWhatsApp()}</p>
        </div>
        <a
          href={linkSuporteTecnico(textoWhatsApp)}
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95"
        >
          Chamar no WhatsApp
        </a>
      </div>
    </div>
  );
}
