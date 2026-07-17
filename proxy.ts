import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer"; // Certifique-se que o caminho está correto

const PUBLIC_PATHS = ["/login"];

// Prefixos de telas da equipe — uma conta de família nunca deveria
// conseguir abrir (evita telas quebradas por RLS e fecha a navegação
// direta por URL para áreas administrativas/clínicas).
const PREFIXOS_STAFF = ["/adm", "/especialista", "/supervisora", "/gestao", "/atendente", "/auxiliar"];

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

  // 4. Conta de família tentando abrir uma tela da equipe (por link direto,
  // favorito antigo etc.) — manda de volta pro próprio portal.
  if (user.email && PREFIXOS_STAFF.some((p) => pathname.startsWith(p))) {
    const { data: usuario } = await supabase.from("usuarios").select("role").eq("email", user.email).maybeSingle();
    const role = (usuario?.role || "").toString().trim().toLowerCase();
    if (role === "familia") {
      const url = request.nextUrl.clone();
      url.pathname = "/familia";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};