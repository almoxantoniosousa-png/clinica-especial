import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

export async function registrarLog({
  usuario_email,
  usuario_nome,
  acao,
  tabela,
  registro_id,
  descricao,
}: {
  usuario_email: string;
  usuario_nome?: string;
  acao: string;
  tabela?: string;
  registro_id?: string;
  descricao?: string;
}) {
  try {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("log_auditoria").insert({
      usuario_email,
      usuario_nome,
      acao,
      tabela,
      registro_id,
      descricao,
    });
  } catch (e) {
    console.error("Erro ao registrar log:", e);
  }
}