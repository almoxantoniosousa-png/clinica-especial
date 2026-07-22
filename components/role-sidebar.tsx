"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { NotificacoesBell } from "@/components/notificacoes-bell";

interface RoleSidebarProps {
  userRole: string;
  userCargo?: string | null;
  userNome?: string | null;
  userContataFamilia?: boolean;
}

export function RoleSidebar({ userRole, userCargo, userNome, userContataFamilia = true }: RoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [colaboradoresAberto, setColaboradoresAberto] = useState(false);
  const [financeiroAberto, setFinanceiroAberto] = useState(false);
  const [geralAberto, setGeralAberto] = useState(true);

  const role = userRole ? userRole.trim().toLowerCase() : "";
  const isAdmin = role === "adm" || role === "admin";
  const isSupervisora = role === "supervisora";
  const isEspecialista = role === "especialista";
  const isGestao = role === "gestao";
  const isFamilia = role === "familia";
  const isAuxAdm      = role === "aux_adm";
  const isFinanceiro  = role === "financeiro";

  useEffect(() => {
    if (
      pathname.includes("/adm/atendentes") || pathname.includes("/adm/especialistas") || pathname.includes("/adm/internas") ||
      pathname.includes("/gestao/atendentes") || pathname.includes("/gestao/especialistas") || pathname.includes("/gestao/internas")
    ) {
      setColaboradoresAberto(true);
    }
    if (pathname.includes("/adm/financeiro") || pathname.includes("/adm/folha-pagamento")) {
      setFinanceiroAberto(true);
    }
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
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

  const subMenuColaboradoresAdm = [
    { href: "/adm/atendentes",    label: "Acompanhantes", icon: "👤" },
    { href: "/adm/especialistas", label: "Especialistas",  icon: "🩺" },
    { href: "/adm/internas",      label: "Internas",       icon: "🏠" },
    { href: "/adm/escala-administrativa", label: "Escala Administrativa", icon: "🗓️" },
  ];

  const subMenuColaboradoresGestao = [
    { href: "/gestao/atendentes",    label: "Acompanhantes", icon: "👤" },
    { href: "/gestao/especialistas", label: "Especialistas",  icon: "🩺" },
    { href: "/gestao/internas",      label: "Internas",       icon: "🏠" },
  ];

  const subMenuFinanceiro = [
    { href: "/adm/financeiro",      label: "Faturamento",       icon: "💰" },
    { href: "/adm/folha-pagamento", label: "Folha de Pagamento", icon: "💵" },
    { href: "/adm/atendimentos-especialistas", label: "Atendimentos Especialistas", icon: "🩺" },
    { href: "/adm/atendimentos-ats", label: "Atendimentos ATs", icon: "📋" },
  ];

  const menuAdmin = [
    { href: "/adm/dashboard",    label: "Dashboard",  icon: "📊" },
    { href: "/adm/agenda-pessoal", label: "Minha Agenda", icon: "🗓️" },
    { href: "/adm/criancas",     label: "Crianças",   icon: "👶" },
    { href: "/adm/escolas",      label: "Escolas",    icon: "🏫" },
    { href: "/adm/responsaveis", label: "Família",    icon: "👨‍👩‍👧" },
    { href: "/adm/requisicoes",  label: "Requisições", icon: "🛒" },
    { href: "/adm/brinquedos",   label: "Brinquedos", icon: "🧸" },
    { href: "/adm/patrimonio",   label: "Patrimônio", icon: "📦" },
    { href: "/adm/mural",        label: "Mural",      icon: "📢" },
    { href: "/adm/protocolos",   label: "Protocolos", icon: "📜" },
    { href: "/ocorrencias",      label: "Ocorrência Diária", icon: "📓" },
    { href: "/reuniao",          label: "Reunião",    icon: "🗒️" },
    { href: "/chat",             label: "Chat",       icon: "💬" },
    { href: "/escala",           label: "Escala",     icon: "📅" },
    { href: "/adm/auditoria",    label: "Auditoria",  icon: "🔍" },
    { href: "/ajuda",            label: "Ajuda",     icon: "❓" },
  ];

  const menuGestao = [
    { href: "/gestao/dashboard",    label: "Dashboard",    icon: "📊" },
    { href: "/gestao/minha-agenda", label: "Minha Agenda", icon: "🗓️" },
    { href: "/gestao/criancas",     label: "Crianças",     icon: "👶" },
    { href: "/gestao/escolas",      label: "Escolas",      icon: "🏫" },
    { href: "/gestao/agenda",       label: "Agenda Clínica", icon: "📅" },
    { href: "/escala",              label: "Escala",         icon: "📅" },
    { href: "/adm/mural",           label: "Mural",        icon: "📢" },
    { href: "/ocorrencias",         label: "Ocorrência Diária", icon: "📓" },
    { href: "/protocolos",          label: "Protocolos",   icon: "📜" },
    { href: "/materiais-adaptados", label: "Materiais Adaptados", icon: "📚" },
    { href: "/requisicoes",         label: "Requisições",  icon: "🛒" },
    { href: "/brinquedos",          label: "Brinquedos",   icon: "🧸" },
    { href: "/patrimonio",          label: "Reportar Defeito", icon: "🔧" },
    { href: "/gestao/relatorios",   label: "Relatórios",   icon: "📈" },
    { href: "/adm/atendimentos-especialistas", label: "Atendimentos Especialistas", icon: "🩺" },
    { href: "/reuniao",             label: "Reunião",      icon: "🗒️" },
    { href: "/chat",                label: "Chat",         icon: "💬" },
    { href: "/gestao/comunicados",  label: "Família",      icon: "💬" },
    { href: "/ajuda",               label: "Ajuda",        icon: "❓" },
  ];

  const menuFamilia = [
    { href: "/familia", label: "Meu Portal", icon: "🏠" },
    { href: "/ajuda",   label: "Ajuda",      icon: "❓" },
  ];

  const menuAtendente = [
    { href: "/atendente/dashboard",          label: "Dashboard",         icon: "📊" },
    { href: "/atendente/novo-registro",      label: "Novo Registro",     icon: "📝" },
    { href: "/atendente/meus-atendimentos",  label: "Meus Atendimentos", icon: "📋" },
    { href: "/atendente/formulario-escolar", label: "Comunicado Diário", icon: "📄" },
    { href: "/atendente/meus-comunicados",   label: "Meus Comunicados",  icon: "📬" },
    { href: "/atendente/escala",             label: "Minha Escala",      icon: "📅" },
    { href: "/brinquedos",                   label: "Brinquedos",        icon: "🧸" },
    { href: "/materiais-adaptados",          label: "Materiais Adaptados", icon: "📚" },
    { href: "/protocolos",                   label: "Protocolos",        icon: "📜" },
    { href: "/mural",                        label: "Mural",             icon: "📢" },
    { href: "/reuniao",                      label: "Reunião",           icon: "🗒️" },
    { href: "/chat",                         label: "Chat",              icon: "💬" },
    { href: "/ajuda",                        label: "Ajuda",             icon: "❓" },
  ];

  const menuSupervisora = [
    ...(userContataFamilia ? [{ href: "/supervisora/comunicados", label: "Comunicados", icon: "📋" }] : []),
    { href: "/supervisora/relatorio",   label: "Registro ABC",      icon: "📝" },
    { href: "/escala",                label: "Escala",                 icon: "📅" },
    { href: "/requisicoes",             label: "Requisições",       icon: "🛒" },
    { href: "/brinquedos",              label: "Brinquedos",        icon: "🧸" },
    { href: "/materiais-adaptados",     label: "Materiais Adaptados", icon: "📚" },
    { href: "/patrimonio",              label: "Reportar Defeito",  icon: "🔧" },
    { href: "/protocolos",              label: "Protocolos",        icon: "📜" },
    { href: "/mural",                   label: "Mural",             icon: "📢" },
    { href: "/reuniao",                 label: "Reunião",           icon: "🗒️" },
    { href: "/chat",                    label: "Chat",              icon: "💬" },
    { href: "/ajuda",                   label: "Ajuda",             icon: "❓" },
  ];

  const menuEspecialista = [
    { href: "/especialista/escala",      label: "Minha Escala", icon: "📅" },
    { href: "/especialista/relatorio",   label: "Prontuário",   icon: "📋" },
    { href: "/especialista/prontuarios", label: "Relatório",    icon: "📝" },
    { href: "/requisicoes",              label: "Requisições",  icon: "🛒" },
    { href: "/brinquedos",               label: "Brinquedos",   icon: "🧸" },
    { href: "/patrimonio",               label: "Reportar Defeito", icon: "🔧" },
    { href: "/protocolos",               label: "Protocolos",   icon: "📜" },
    { href: "/mural",                    label: "Mural",        icon: "📢" },
    { href: "/reuniao",                  label: "Reunião",      icon: "🗒️" },
    { href: "/chat",                     label: "Chat",         icon: "💬" },
    { href: "/ajuda",                    label: "Ajuda",        icon: "❓" },
  ];

  const menuFinanceiro = [
    { href: "/adm/financeiro",      label: "Faturamento",       icon: "💰" },
    { href: "/adm/folha-pagamento", label: "Folha de Pagamento", icon: "💵" },
    { href: "/adm/atendimentos-especialistas", label: "Atendimentos Especialistas", icon: "🩺" },
    { href: "/adm/atendimentos-ats", label: "Atendimentos ATs", icon: "📋" },
    { href: "/adm/patrimonio",      label: "Patrimônio",        icon: "📦" },
    { href: "/protocolos",          label: "Protocolos",        icon: "📜" },
    { href: "/reuniao",             label: "Reunião",           icon: "🗒️" },
    { href: "/chat",                label: "Chat",              icon: "💬" },
    { href: "/ajuda",                label: "Ajuda",            icon: "❓" },
  ];

  const menuAuxAdm = [
    { href: "/auxiliar/pauta",       label: "Agenda Simone", icon: "🗓️" },
    { href: "/auxiliar/brinquedos",  label: "Brinquedos",    icon: "🧸" },
    { href: "/adm/financeiro",       label: "Faturamento",   icon: "💰" },
    { href: "/adm/patrimonio",       label: "Patrimônio",    icon: "📦" },
    { href: "/protocolos",           label: "Protocolos",    icon: "📜" },
    { href: "/mural",                label: "Mural",         icon: "📢" },
    { href: "/ocorrencias",          label: "Ocorrência Diária", icon: "📓" },
    { href: "/reuniao",              label: "Reunião",       icon: "🗒️" },
    { href: "/chat",                 label: "Chat",          icon: "💬" },
    { href: "/ajuda",                label: "Ajuda",         icon: "❓" },
  ];

  const menu = isAdmin ? menuAdmin
    : isSupervisora ? menuSupervisora
    : isGestao ? menuGestao
    : isEspecialista ? menuEspecialista
    : isFamilia ? menuFamilia
    : isAuxAdm ? menuAuxAdm
    : isFinanceiro ? menuFinanceiro
    : menuAtendente;

  const roleLabel = userCargo ? userCargo
    : isAdmin ? "Administrador"
    : isSupervisora ? "Supervisora"
    : isGestao ? "Gestão"
    : isEspecialista ? "Especialista"
    : isFamilia ? "Família"
    : isAuxAdm ? "Aux. Administrativo"
    : isFinanceiro ? "Financeiro"
    : "Acompanhante";

  const identLabel = userNome ? `${userNome} - ${roleLabel}` : roleLabel;

  const Logo = ({ size }: { size: "sm" | "md" }) => {
    const dim = size === "sm" ? "w-9 h-9" : "w-10 h-10";
    return (
      <div className={`${dim} rounded-full overflow-hidden flex-shrink-0 bg-white border border-slate-200 flex items-center justify-center`}>
        <img src="/logo.png" alt="Logo Clínica Abraço" className="w-full h-full object-contain" />
      </div>
    );
  };

  const MenuItem = ({ item }: { item: { href: string; label: string; icon: string } }) => {
    const ativo = pathname === item.href;
    return (
      <Link href={item.href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
          ${ativo
            ? "bg-blue-600 text-white font-semibold"
            : "text-slate-600 hover:bg-blue-50 hover:text-blue-700 font-medium"}`}>
        <span className="text-base leading-none">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  const Accordion = ({ label, icon, subItems, aberto, onToggle }: {
    label: string; icon: string;
    subItems: { href: string; label: string; icon: string }[];
    aberto: boolean; onToggle: () => void;
  }) => {
    const isAtivo = subItems.some(s => pathname === s.href);
    return (
      <div>
        <button onClick={onToggle}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${isAtivo ? "bg-blue-600 text-white font-semibold" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>
          <span className="text-base leading-none">{icon}</span>
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${aberto ? "rotate-180" : ""} opacity-60`} />
        </button>
        {aberto && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
            {subItems.map((item) => {
              const ativo = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all
                    ${ativo ? "bg-blue-600 text-white font-semibold" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700 font-medium"}`}>
                  <span className="text-sm leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderMenu = () => (
    <nav className="px-2 py-3 space-y-0.5">
      {(isAdmin || isGestao) ? (
        <>
          <MenuItem item={(isAdmin ? menuAdmin : menuGestao)[0]} />

          <div className="pt-3 pb-0.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 pb-1">Pessoas</p>
          </div>

          <Accordion
            label="Colaboradores" icon="👥"
            subItems={isAdmin ? subMenuColaboradoresAdm : subMenuColaboradoresGestao}
            aberto={colaboradoresAberto}
            onToggle={() => setColaboradoresAberto(!colaboradoresAberto)}
          />

          {isAdmin && (
            <>
              <div className="pt-3 pb-0.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 pb-1">Financeiro</p>
              </div>
              <Accordion
                label="Financeiro" icon="💰"
                subItems={subMenuFinanceiro}
                aberto={financeiroAberto}
                onToggle={() => setFinanceiroAberto(!financeiroAberto)}
              />
            </>
          )}

          <div className="pt-3 pb-0.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 pb-1">Geral</p>
          </div>

          <Accordion
            label="Menu completo" icon="📋"
            subItems={(isAdmin ? menuAdmin : menuGestao).slice(1)}
            aberto={geralAberto}
            onToggle={() => setGeralAberto(!geralAberto)}
          />
        </>
      ) : (
        menu.map((item) => <MenuItem key={item.href} item={item} />)
      )}
    </nav>
  );

  return (
    <>
      {!isMobile && (
        <aside className="print:hidden w-56 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between flex-shrink-0">
          <div>
            <div className="px-4 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <Logo size="md" />
                <NotificacoesBell userRole={role} align="left" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">Clínica Abraço</p>
                <p title={identLabel} className="text-[10px] font-medium text-slate-400 leading-snug uppercase tracking-wider truncate">{identLabel}</p>
              </div>
            </div>
            {renderMenu()}
          </div>
          <div className="px-2 pb-4 border-t border-slate-100 pt-3">
            <button onClick={() => setConfirmandoSaida(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group">
              <svg className="w-4 h-4 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair do sistema
            </button>
          </div>
        </aside>
      )}

      {isMobile && (
        <>
          <div className="print:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" />
              <span className="font-bold text-blue-900 text-sm">Clínica Abraço</span>
            </div>
            <div className="flex items-center gap-1">
              <NotificacoesBell userRole={role} />
              <button onClick={() => setMenuAberto(!menuAberto)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
                {menuAberto ? (
                  <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="h-16" />
        </>
      )}

      {isMobile && menuAberto && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMenuAberto(false)} />
          <div className="fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-xl flex flex-col">
            <div className="flex items-start justify-between px-4 py-4 border-b border-slate-100">
              <div>
                <Logo size="md" />
                <p className="font-bold text-slate-800 text-sm mt-2">Clínica Abraço</p>
                <p title={identLabel} className="text-[10px] font-medium text-slate-400 leading-snug uppercase tracking-wider truncate max-w-[13rem]">{identLabel}</p>
              </div>
              <button onClick={() => setMenuAberto(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderMenu()}
            </div>
            <div className="px-2 pb-5 border-t border-slate-100 pt-3">
              <button onClick={() => { setMenuAberto(false); setConfirmandoSaida(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all">
                <svg className="w-4 h-4 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair do sistema
              </button>
            </div>
          </div>
        </>
      )}

      {confirmandoSaida && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmandoSaida(false); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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