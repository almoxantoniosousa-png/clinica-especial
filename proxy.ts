import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer"; // Certifique-se que o caminho está correto

const PUBLIC_PATHS = ["/login"];

// Prefixos de telas da equipe e quais roles podem abrir cada um — fecha a
// navegação direta por URL entre portais diferentes (ex.: atendente abrindo
// /adm/dashboard) e não só o bloqueio de contas de família.
const PREFIXOS_STAFF: { prefixo: string; roles: string[] }[] = [
  // Exceções específicas dentro de /adm que a aux_adm também acessa —
  // precisam vir antes da regra geral de "/adm" pra serem checadas primeiro.
  { prefixo: "/adm/financeiro", roles: ["adm", "admin", "financeiro", "aux_adm"] },
  { prefixo: "/adm/patrimonio", roles: ["adm", "admin", "financeiro", "aux_adm"] },
  { prefixo: "/adm", roles: ["adm", "admin", "financeiro"] },
  { prefixo: "/especialista", roles: ["especialista"] },
  { prefixo: "/supervisora", roles: ["supervisora"] },
  { prefixo: "/gestao", roles: ["gestao"] },
  { prefixo: "/atendente", roles: ["atendente", "at"] },
  { prefixo: "/auxiliar", roles: ["aux_adm"] },
  { prefixo: "/plano-terapeutico", roles: ["gestao", "supervisora", "especialista"] },
];

// Pra onde mandar de volta quando o role não bate com a rota acessada.
const HOME_POR_ROLE: Record<string, string> = {
  adm: "/adm/dashboard",
  admin: "/adm/dashboard",
  gestao: "/gestao/dashboard",
  supervisora: "/supervisora/comunicados",
  especialista: "/especialista/escala",
  familia: "/familia",
  financeiro: "/adm/financeiro",
  atendente: "/atendente/dashboard",
  at: "/atendente/dashboard",
  aux_adm: "/auxiliar/agenda",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Libera caminhos públicos e arquivos estáticos
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isStaticFile = pathname.includes('_next') ||
                       pathname.includes('favicon') ||
                       pathname.includes('api/');

  if (isPublicPath || isStaticFile) {
    return NextResponse.next();
  }

  // 2. FORMA CORRETA: Usa o cliente do Supabase para validar a sessão real
  // Isso resolve o problema de nomes de cookies diferentes
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Se não houver usuário autenticado, manda para o login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 4. Portal errado pra esse role (conta de família abrindo tela da equipe,
  // ou um role da equipe abrindo o portal de outro, tipo atendente em
  // /adm/dashboard) — manda de volta pro próprio portal.
  const alvo = PREFIXOS_STAFF.find((p) => pathname.startsWith(p.prefixo));
  if (user.email && alvo) {
    const { data: usuario } = await supabase.from("usuarios").select("role").eq("email", user.email).maybeSingle();
    let role = (usuario?.role || "").toString().trim().toLowerCase();
    if (!role) {
      const { data: atendente } = await supabase.from("atendentes").select("role").eq("email", user.email).maybeSingle();
      role = (atendente?.role || "").toString().trim().toLowerCase();
    }

    if (!alvo.roles.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = HOME_POR_ROLE[role] || "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};