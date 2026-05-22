"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface RoleSidebarProps {
  userRole: string;
}

export function RoleSidebar({ userRole }: RoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const role = userRole ? userRole.trim().toLowerCase() : "";
  const isAdmin = role === "adm" || role === "admin";
  const isSupervisora = role === "supervisora";
  const isGestao = role === "gestao";

  // Detectar mobile via JS — mais confiável que CSS breakpoints
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 1024);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => { setMenuAberto(false); }, [pathname]);

  useEffect(() => {
    if (menuAberto) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [menuAberto]);

  async function handleLogout() {
    setSaindo(true);
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  const menuAdmin = [
    { href: "/adm/dashboard",  label: "Dashboard",  icon: "📊" },
    { href: "/adm/financeiro", label: "Financeiro",  icon: "💰" },
    { href: "/adm/atendentes", label: "Atendentes",  icon: "👤" },
    { href: "/adm/criancas",   label: "Crianças",    icon: "👶" },
    { href: "/adm/mural",      label: "Mural",       icon: "📢" },
  ];

  const menuAtendente = [
    { href: "/atendente/novo-registro",       label: "Novo Registro",     icon: "📝" },
    { href: "/atendente/meus-atendimentos",   label: "Meus Atendimentos", icon: "📋" },
    { href: "/atendente/formulario-escolar",  label: "Comunicado Diário", icon: "📄" },
    { href: "/atendente/meus-comunicados",    label: "Meus Comunicados",  icon: "📬" },
    { href: "/adm/mural",                     label: "Mural",             icon: "📢" },
  ];

  const menuSupervisora = [
    { href: "/supervisora/comunicados", label: "Comunicados", icon: "📋" },
    { href: "/adm/mural",               label: "Mural",       icon: "📢" },
  ];

  const menuGestao = [
    { href: "/gestao/dashboard",  label: "Dashboard",  icon: "📊" },
    { href: "/gestao/criancas",   label: "Crianças",   icon: "👶" },
    { href: "/gestao/agenda",     label: "Agenda",     icon: "📅" },
    { href: "/adm/mural",         label: "Mural",      icon: "📢" },
    { href: "/gestao/relatorios", label: "Relatórios", icon: "📈" },
  ];

  const menu = isAdmin ? menuAdmin
    : isSupervisora ? menuSupervisora
    : isGestao ? menuGestao
    : menuAtendente;

  const roleLabel = isAdmin ? "Administrador"
    : isSupervisora ? "Supervisora"
    : isGestao ? "Gestão"
    : "Atendente";

  const MenuLinks = () => (
    <>
      {menu.map((item) => {
        const ativo = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
              ${ativo
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
            {ativo && <span className="ml-auto w-2 h-2 rounded-full bg-blue-600"/>}
          </Link>
        );
      })}
    </>
  );

  const BotaoSair = () => (
    <button
      onClick={() => { setMenuAberto(false); setConfirmandoSaida(true); }}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
        text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group"
    >
      <svg className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
      </svg>
      Sair do sistema
    </button>
  );

  return (
    <>
      {/* SIDEBAR — apenas desktop */}
      {!isMobile && (
        <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between flex-shrink-0">
          <div>
            <div className="px-5 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover"/>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm leading-tight">Clínica Abraço</p>
                  <p className="text-xs text-slate-400">{roleLabel}</p>
                </div>
              </div>
            </div>
            <nav className="px-3 py-4 space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">Menu</p>
              <MenuLinks />
            </nav>
          </div>
          <div className="px-3 pb-5 border-t border-slate-100 pt-4">
            <BotaoSair />
          </div>
        </aside>
      )}

      {/* TOPBAR — apenas mobile */}
      {isMobile && (
        <>
          <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover"/>
              </div>
              <span className="font-bold text-blue-900 text-sm">Clínica Abraço</span>
            </div>
            <button
              onClick={() => setMenuAberto(!menuAberto)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition"
            >
              {menuAberto ? (
                <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              )}
            </button>
          </div>
          <div className="h-16"/>
        </>
      )}

      {/* DRAWER MOBILE */}
      {isMobile && menuAberto && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMenuAberto(false)}/>
          <div className="fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover"/>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Clínica Abraço</p>
                  <p className="text-xs text-slate-400">{roleLabel}</p>
                </div>
              </div>
              <button onClick={() => setMenuAberto(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">Menu</p>
              <MenuLinks />
            </nav>
            <div className="px-3 pb-6 border-t border-slate-100 pt-4">
              <BotaoSair />
            </div>
          </div>
        </>
      )}

      {/* MODAL CONFIRMAÇÃO SAÍDA */}
      {confirmandoSaida && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmandoSaida(false); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Sair do sistema</h3>
                <p className="text-sm text-slate-500 mt-1">Tem certeza que deseja encerrar a sessão?</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmandoSaida(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition">
                Cancelar
              </button>
              <button onClick={handleLogout} disabled={saindo}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold active:scale-95 transition disabled:opacity-50">
                {saindo ? "Saindo..." : "Sim, sair"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}