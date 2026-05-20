"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface RoleSidebarProps {
  userRole: string;
}

export function RoleSidebar({ userRole }: RoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const role = userRole ? userRole.trim().toLowerCase() : "";
  const isAdmin = role === "adm" || role === "admin";

  async function handleLogout() {
    setSaindo(true);
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  const menuAdmin = [
    { href: "/adm/dashboard",   label: "Dashboard",           icon: "📊" },
    { href: "/adm/financeiro",  label: "Financeiro",          icon: "💰" },
    { href: "/adm/atendentes",  label: "Atendentes",          icon: "👤" },
    { href: "/adm/criancas",    label: "Crianças",            icon: "👶" },
  ];

  const menuAtendente = [
    { href: "/atendente/novo-registro",      label: "Novo Registro",       icon: "📝" },
    { href: "/atendente/meus-atendimentos",  label: "Meus Atendimentos",   icon: "📋" },
  ];

  const menu = isAdmin ? menuAdmin : menuAtendente;

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between">

        {/* TOPO — Logo/título */}
        <div>
          <div className="px-5 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-900 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                CA
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">Clínica Abraço</p>
                <p className="text-xs text-slate-400 capitalize">{isAdmin ? "Administrador" : "Atendente"}</p>
              </div>
            </div>
          </div>

          {/* MENU */}
          <nav className="px-3 py-4 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
              Menu
            </p>
            {menu.map((item) => {
              const ativo = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${ativo
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                  {ativo && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"/>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* RODAPÉ — Logout */}
        <div className="px-3 pb-5 space-y-2">
          <div className="border-t border-slate-100 pt-4">
            <button
              onClick={() => setConfirmandoSaida(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Sair do sistema
            </button>
          </div>
        </div>
      </aside>

      {/* MODAL DE CONFIRMAÇÃO DE SAÍDA */}
      {confirmandoSaida && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmandoSaida(false); }}
        >
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Sair do sistema</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Tem certeza que deseja encerrar a sessão?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmandoSaida(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm
                  font-semibold hover:bg-slate-50 active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                disabled={saindo}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm
                  font-semibold active:scale-95 transition disabled:opacity-50"
              >
                {saindo ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Saindo...
                  </span>
                ) : "Sim, sair"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}