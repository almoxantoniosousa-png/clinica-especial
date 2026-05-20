"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface RoleSidebarProps {
  userRole: string;
}

export function RoleSidebar({ userRole }: RoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // 🔐 Normaliza a role
  const role = userRole ? userRole.trim().toLowerCase() : "";

  // ✅ Define se é admin
  const isAdmin = role === "adm" || role === "admin";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 min-h-screen flex flex-col justify-between p-4">
      
      {/* MENU */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">
            Menu ({role})
          </h2>
        </div>

        <nav className="flex flex-col gap-1">

          {/* 🔥 ADMIN */}
          {isAdmin && (
            <>
              <Link
                href="/adm/dashboard"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/adm/dashboard"
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                📊 Dashboard
              </Link>

              <Link
                href="/adm/atendentes"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/adm/atendentes/novo"
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                👤 Cadastrar Atendente
              </Link>

              <Link
                href="/adm/financeiro"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/adm/financeiro"
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                💰 Financeiro
              </Link>

              {/* 👶 CRIANÇAS (NOVO) */}
              <Link
                href="/adm/criancas"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/adm/criancas"
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                👶 Cadastrar Criança
              </Link>
            </>
          )}

          {/* 👤 ATENDENTE */}
          {!isAdmin && (
            <>
              <Link
                href="/atendente/novo-registro"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/atendente/novo-registro"
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                📝 Novo Registro
              </Link>

              <Link
                href="/atendente/meus-atendimentos"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/atendente/meus-atendimentos"
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                📋 Meus Atendimentos
              </Link>
            </>
          )}

        </nav>
      </div>

      {/* 🔓 LOGOUT */}
      <div className="border-t border-slate-200 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
        >
          🚪 Sair do Sistema
        </button>
      </div>
    </aside>
  );
}