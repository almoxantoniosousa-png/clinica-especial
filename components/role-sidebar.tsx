"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { NotificacoesBell } from "@/components/notificacoes-bell";
import { useGravacao } from "@/contexts/gravacao-context";
import { useValoresVisiveis } from "@/contexts/valores-visiveis-context";
import { primeiroNome } from "@/lib/dataUtils";
import { Saudacao } from "@/components/painel-informacoes";

interface RoleSidebarProps {
  userRole: string;
  userCargo?: string | null;
  userNome?: string | null;
  userContataFamilia?: boolean;
  userFazAdaptado?: boolean;
}

export function RoleSidebar({ userRole, userCargo, userNome, userContataFamilia = true, userFazAdaptado = false }: RoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [financeiroAberto, setFinanceiroAberto] = useState(false);
  const [geralAberto, setGeralAberto] = useState(true);
  const [dropdownNav, setDropdownNav] = useState<string | null>(null);
  const { visivel: valoresVisiveis, alternar: alternarValores } = useValoresVisiveis();

  const role = userRole ? userRole.trim().toLowerCase() : "";
  const isAdmin = role === "adm" || role === "admin";
  const isSupervisora = role === "supervisora";
  const isEspecialista = role === "especialista";
  const isGestao = role === "gestao";
  const isFamilia = role === "familia";
  const isAuxAdm      = role === "aux_adm";
  const isFinanceiro  = role === "financeiro";
  const isApoio       = role === "apoio";
  const isAtendenteRole = !isAdmin && !isSupervisora && !isEspecialista && !isGestao && !isFamilia && !isAuxAdm && !isFinanceiro && !isApoio;

  useEffect(() => {
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

  useEffect(() => { setMenuAberto(false); setDropdownNav(null); }, [pathname]);

  useEffect(() => {
    if (!dropdownNav) return;
    function fechar(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-nav-dropdown]")) setDropdownNav(null);
    }
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, [dropdownNav]);

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
    { href: "/adm/colaboradores", label: "Colaboradores", icon: "👥" },
  ];

  const subMenuColaboradoresGestao = [
    { href: "/gestao/colaboradores", label: "Colaboradores", icon: "👥" },
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
    { href: "/adm/patrimonio",   label: "Patrimônio", icon: "📦" },
    { href: "/adm/estoque-limpeza", label: "Materiais de Limpeza", icon: "🧴" },
    { href: "/mural",            label: "Mural",      icon: "📢" },
    { href: "/adm/protocolos",   label: "Protocolos", icon: "📜" },
    { href: "/adm/legislacao",   label: "Legislação de Apoio", icon: "📚" },
    { href: "/ocorrencias",      label: "Ocorrência Diária", icon: "📓" },
    { href: "/reuniao",          label: "Reunião",    icon: "🗒️" },
    { href: "/chat",             label: "Chat",       icon: "💬" },
    { href: "/escala",           label: "Escala",     icon: "📅" },
    { href: "/adm/auditoria",    label: "Auditoria",  icon: "🔍" },
    { href: "/gravacoes",        label: "Record",     icon: "🎥" },
    { href: "/ajuda",            label: "Ajuda",     icon: "❓" },
    { href: "/suporte-tecnico",  label: "Suporte Técnico", icon: "🛟" },
  ];

  // Barra horizontal do ADM: Dashboard e Colaboradores direto, o resto
  // dividido em 3 dropdowns nomeados por função (não um balde genérico
  // tipo "Geral"/"Mais") — formato validado com a usuária via protótipo.
  const HREFS_ADMIN_ROTINA = ["/adm/agenda-pessoal", "/escala", "/adm/criancas", "/adm/escolas", "/adm/responsaveis", "/ocorrencias", "/reuniao", "/mural", "/chat"];
  const HREFS_ADMIN_SISTEMA = ["/adm/requisicoes", "/adm/patrimonio", "/adm/estoque-limpeza", "/adm/protocolos", "/adm/legislacao", "/adm/auditoria", "/gravacoes", "/ajuda", "/suporte-tecnico"];
  const menuAdminRotina = menuAdmin.filter((i) => HREFS_ADMIN_ROTINA.includes(i.href));
  const menuAdminSistema = menuAdmin.filter((i) => HREFS_ADMIN_SISTEMA.includes(i.href));

  // Preenche o vão entre o menu e os ícones com o "endereço" da tela atual —
  // útil porque a página em si não tem mais um H1 próprio (a saudação
  // migrou pra dentro da barra), então isso é o que diz onde a ADM está.
  const paginaAtualAdm = [...menuAdmin, ...subMenuColaboradoresAdm, ...subMenuFinanceiro]
    .find((i) => pathname === i.href);

  const menuGestao = [
    { href: "/gestao/dashboard",    label: "Dashboard",    icon: "📊" },
    { href: "/gestao/minha-agenda", label: "Minha Agenda", icon: "🗓️" },
    { href: "/gestao/entrevista-inicial", label: "Entrevista Inicial", icon: "📋" },
    { href: "/gestao/criancas",     label: "Crianças",     icon: "👶" },
    { href: "/gestao/escolas",      label: "Escolas",      icon: "🏫" },
    { href: "/escala",              label: "Escala",         icon: "📅" },
    { href: "/mural",               label: "Mural",        icon: "📢" },
    { href: "/ocorrencias",         label: "Ocorrência Diária", icon: "📓" },
    { href: "/gestao/protocolos",   label: "Protocolos",   icon: "📜" },
    { href: "/legislacao",          label: "Legislação de Apoio", icon: "📚" },
    { href: "/materiais-adaptados", label: "Materiais Adaptados", icon: "📚" },
    { href: "/requisicoes",         label: "Requisições",  icon: "🛒" },
    { href: "/patrimonio",          label: "Reportar Defeito", icon: "🔧" },
    { href: "/gestao/relatorios",   label: "Relatórios",   icon: "📈" },
    { href: "/plano-terapeutico",   label: "Plano Terapêutico", icon: "📋" },
    { href: "/adm/atendimentos-especialistas", label: "Atendimentos Especialistas", icon: "🩺" },
    { href: "/reuniao",             label: "Reunião",      icon: "🗒️" },
    { href: "/chat",                label: "Chat",         icon: "💬" },
    { href: "/gestao/comunicados",  label: "Família",      icon: "💬" },
    { href: "/gravacoes",           label: "Record",       icon: "🎥" },
    { href: "/ajuda",               label: "Ajuda",        icon: "❓" },
    { href: "/suporte-tecnico",     label: "Suporte Técnico", icon: "🛟" },
  ];

  // Barra horizontal da Gestão: mesmo esqueleto do ADM (Dashboard + Minha
  // Agenda direto, resto em 3 grupos), já que o menu dela é quase do mesmo
  // tamanho (20 itens).
  const HREFS_GESTAO_ATENDIMENTO = ["/gestao/entrevista-inicial", "/gestao/criancas", "/gestao/escolas", "/plano-terapeutico", "/adm/atendimentos-especialistas"];
  const HREFS_GESTAO_ROTINA = ["/escala", "/ocorrencias", "/mural", "/materiais-adaptados", "/requisicoes", "/patrimonio", "/gestao/comunicados"];
  const HREFS_GESTAO_SISTEMA = ["/gestao/protocolos", "/legislacao", "/gestao/relatorios", "/reuniao", "/chat", "/gravacoes", "/ajuda", "/suporte-tecnico"];
  const menuGestaoAtendimento = menuGestao.filter((i) => HREFS_GESTAO_ATENDIMENTO.includes(i.href));
  const menuGestaoRotina = menuGestao.filter((i) => HREFS_GESTAO_ROTINA.includes(i.href));
  const menuGestaoSistema = menuGestao.filter((i) => HREFS_GESTAO_SISTEMA.includes(i.href));
  const paginaAtualGestao = [...menuGestao, ...subMenuColaboradoresGestao].find((i) => pathname === i.href);

  const menuFamilia = [
    { href: "/familia", label: "Meu Portal", icon: "🏠" },
    { href: "/ajuda",   label: "Ajuda",      icon: "❓" },
    { href: "/suporte-tecnico", label: "Suporte Técnico", icon: "🛟" },
  ];

  const menuAtendente = [
    { href: "/atendente/dashboard",          label: "Dashboard",         icon: "📊" },
    { href: "/atendente/novo-registro",      label: "Novo Registro",     icon: "📝" },
    { href: "/atendente/meus-atendimentos",  label: "Meus Atendimentos", icon: "📋" },
    { href: "/atendente/formulario-escolar", label: "Comunicado Diário", icon: "📄" },
    { href: "/atendente/meus-comunicados",   label: "Meus Comunicados",  icon: "📬" },
    { href: "/atendente/acompanhamento-escola", label: "Acompanhamento", icon: "📋" },
    { href: "/escala",                       label: "Minha Escala",      icon: "📅" },
    ...(userFazAdaptado ? [{ href: "/materiais-adaptados", label: "Materiais Adaptados", icon: "📚" }] : []),
    { href: "/protocolos",                   label: "Protocolos",        icon: "📜" },
    { href: "/mural",                        label: "Mural",             icon: "📢" },
    { href: "/reuniao",                      label: "Reunião",           icon: "🗒️" },
    { href: "/chat",                         label: "Chat",              icon: "💬" },
    { href: "/ajuda",                        label: "Ajuda",             icon: "❓" },
    { href: "/suporte-tecnico",              label: "Suporte Técnico",   icon: "🛟" },
  ];

  const menuSupervisora = [
    ...(userContataFamilia ? [{ href: "/supervisora/comunicados", label: "Comunicados", icon: "📋" }] : []),
    { href: "/supervisora/relatorio",   label: "Registro ABC",      icon: "📝" },
    { href: "/plano-terapeutico",       label: "Plano Terapêutico", icon: "📋" },
    { href: "/ocorrencias",             label: "Ocorrência Diária", icon: "📓" },
    { href: "/escala",                label: "Escala",                 icon: "📅" },
    { href: "/requisicoes",             label: "Requisições",       icon: "🛒" },
    { href: "/materiais-adaptados",     label: "Materiais Adaptados", icon: "📚" },
    { href: "/patrimonio",              label: "Reportar Defeito",  icon: "🔧" },
    { href: "/protocolos",              label: "Protocolos",        icon: "📜" },
    { href: "/legislacao",              label: "Legislação de Apoio", icon: "📚" },
    { href: "/mural",                   label: "Mural",             icon: "📢" },
    { href: "/reuniao",                 label: "Reunião",           icon: "🗒️" },
    { href: "/chat",                    label: "Chat",              icon: "💬" },
    { href: "/ajuda",                   label: "Ajuda",             icon: "❓" },
    { href: "/suporte-tecnico",         label: "Suporte Técnico",   icon: "🛟" },
  ];

  // Barra horizontal da Supervisora: as 3 telas do dia a dia direto (a
  // "inicial" varia — quem fala com família cai em Comunicados, quem não
  // fala cai em Materiais Adaptados), o resto dividido em Clínico/Apoio.
  const menuSupervisoraInicial = userContataFamilia
    ? { href: "/supervisora/comunicados", label: "Comunicados", icon: "📋" }
    : { href: "/materiais-adaptados", label: "Materiais Adaptados", icon: "📚" };
  const HREFS_SUP_CLINICO = ["/plano-terapeutico", "/ocorrencias", "/materiais-adaptados", "/protocolos", "/legislacao"];
  const HREFS_SUP_APOIO = ["/requisicoes", "/patrimonio", "/mural", "/reuniao", "/chat", "/ajuda", "/suporte-tecnico"];
  const menuSupervisoraClinico = menuSupervisora.filter((i) => HREFS_SUP_CLINICO.includes(i.href) && i.href !== menuSupervisoraInicial.href);
  const menuSupervisoraApoio = menuSupervisora.filter((i) => HREFS_SUP_APOIO.includes(i.href));
  const paginaAtualSup = [menuSupervisoraInicial, { href: "/supervisora/relatorio", label: "Registro ABC", icon: "📝" }, { href: "/escala", label: "Escala", icon: "📅" }, ...menuSupervisoraClinico, ...menuSupervisoraApoio]
    .find((i) => pathname === i.href);

  const menuEspecialista = [
    { href: "/especialista/escala",      label: "Minha Escala", icon: "📅" },
    { href: "/especialista/relatorio",   label: "Prontuário",   icon: "📋" },
    { href: "/especialista/prontuarios", label: "Relatório",    icon: "📝" },
    { href: "/plano-terapeutico",        label: "Plano Terapêutico", icon: "📋" },
    { href: "/requisicoes",              label: "Requisições",  icon: "🛒" },
    { href: "/patrimonio",               label: "Reportar Defeito", icon: "🔧" },
    { href: "/protocolos",               label: "Protocolos",   icon: "📜" },
    { href: "/legislacao",               label: "Legislação de Apoio", icon: "📚" },
    { href: "/mural",                    label: "Mural",        icon: "📢" },
    { href: "/reuniao",                  label: "Reunião",      icon: "🗒️" },
    { href: "/chat",                     label: "Chat",         icon: "💬" },
    { href: "/ajuda",                    label: "Ajuda",        icon: "❓" },
    { href: "/suporte-tecnico",          label: "Suporte Técnico", icon: "🛟" },
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
    { href: "/suporte-tecnico",      label: "Suporte Técnico",  icon: "🛟" },
  ];

  const menuApoio = [
    { href: "/apoio/materiais",      label: "Materiais de Limpeza", icon: "🧴" },
    { href: "/requisicoes",          label: "Requisições",       icon: "🛒" },
    { href: "/mural",                label: "Mural",             icon: "📢" },
    { href: "/chat",                 label: "Chat",              icon: "💬" },
    { href: "/ajuda",                label: "Ajuda",             icon: "❓" },
    { href: "/suporte-tecnico",      label: "Suporte Técnico",   icon: "🛟" },
  ];

  const menuAuxAdm = [
    { href: "/auxiliar/agenda",      label: "Agenda",         icon: "🗓️" },
    { href: "/auxiliar/pauta",       label: "Agenda Simone", icon: "📆" },
    { href: "/escala",               label: "Escala",        icon: "📅" },
    { href: "/adm/criancas",         label: "Crianças",      icon: "👶" },
    { href: "/adm/escolas",          label: "Escolas",       icon: "🏫" },
    { href: "/adm/colaboradores",    label: "Colaboradores", icon: "👥" },
    { href: "/adm/financeiro",       label: "Faturamento",   icon: "💰" },
    { href: "/adm/patrimonio",       label: "Patrimônio",    icon: "📦" },
    { href: "/protocolos",           label: "Protocolos",    icon: "📜" },
    { href: "/mural",                label: "Mural",         icon: "📢" },
    { href: "/ocorrencias",          label: "Ocorrência Diária", icon: "📓" },
    { href: "/reuniao",              label: "Reunião",       icon: "🗒️" },
    { href: "/chat",                 label: "Chat",          icon: "💬" },
    { href: "/ajuda",                label: "Ajuda",         icon: "❓" },
    { href: "/suporte-tecnico",      label: "Suporte Técnico", icon: "🛟" },
  ];

  // Barra horizontal da Aux Adm: as 2 agendas direto (a de crianças/AT, que
  // hoje nem tinha item de menu, e a pauta pessoal da Simone), resto dividido
  // em Cadastros/Apoio.
  const HREFS_AUXADM_CADASTROS = ["/adm/criancas", "/adm/escolas", "/adm/colaboradores", "/adm/financeiro"];
  const HREFS_AUXADM_APOIO = ["/adm/patrimonio", "/protocolos", "/mural", "/ocorrencias", "/reuniao", "/chat", "/ajuda", "/suporte-tecnico"];
  const menuAuxAdmCadastros = menuAuxAdm.filter((i) => HREFS_AUXADM_CADASTROS.includes(i.href));
  const menuAuxAdmApoio = menuAuxAdm.filter((i) => HREFS_AUXADM_APOIO.includes(i.href));
  const paginaAtualAuxAdm = menuAuxAdm.find((i) => pathname === i.href);

  const menu = isAdmin ? menuAdmin
    : isSupervisora ? menuSupervisora
    : isGestao ? menuGestao
    : isEspecialista ? menuEspecialista
    : isFamilia ? menuFamilia
    : isAuxAdm ? menuAuxAdm
    : isFinanceiro ? menuFinanceiro
    : isApoio ? menuApoio
    : menuAtendente;

  const roleLabel = userCargo ? userCargo
    : isAdmin ? "Administrador"
    : isSupervisora ? "Supervisora"
    : isGestao ? "Gestão"
    : isEspecialista ? "Especialista"
    : isFamilia ? "Família"
    : isAuxAdm ? "Aux. Administrativo"
    : isFinanceiro ? "Financeiro"
    : isApoio ? "Apoio"
    : "Acompanhante Terapêutica";

  const nomeExibicao = userNome ? primeiroNome(userNome) : "";
  const identLabel = userNome ? `${nomeExibicao} - ${roleLabel}` : roleLabel;

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
    const { gravando } = useGravacao();
    return (
      <Link href={item.href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200
          ${ativo
            ? isFamilia
              ? "bg-orange-500 text-white font-semibold shadow-sm shadow-orange-600/30"
              : "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30"
            : isFamilia
              ? "text-slate-600 hover:bg-orange-100/70 hover:text-orange-700 hover:translate-x-0.5 font-medium"
              : "text-slate-600 hover:bg-blue-100/70 hover:text-blue-700 hover:translate-x-0.5 font-medium"}`}>
        <span className="text-base leading-none">{item.icon}</span>
        <span>{item.label}</span>
        {item.href === "/gravacoes" && gravando && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-auto" />
        )}
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
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
            ${isAtivo ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30" : "text-slate-600 hover:bg-blue-100/70 hover:text-blue-700"}`}>
          <span className="text-base leading-none">{icon}</span>
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${aberto ? "rotate-180" : ""} opacity-60`} />
        </button>
        {aberto && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-blue-200 pl-3">
            {subItems.map((item) => {
              const ativo = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-sm transition-all duration-200
                    ${ativo ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30" : "text-slate-600 hover:bg-blue-100/70 hover:text-blue-700 hover:translate-x-0.5 font-medium"}`}>
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

  const NavDropdown = ({ id, label, icon, items }: {
    id: string; label: string; icon: string;
    items: { href: string; label: string; icon: string }[];
  }) => {
    const ativo = items.some((i) => pathname === i.href);
    const aberto = dropdownNav === id;
    return (
      <div className="relative" data-nav-dropdown>
        <button onClick={() => setDropdownNav(aberto ? null : id)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
            ${ativo || aberto ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
          <span className="text-sm leading-none">{icon}</span>
          <span>{label}</span>
          <ChevronDown className={`h-3 w-3 opacity-70 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
        </button>
        {aberto && (
          <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 p-1.5 z-20">
            {items.map((item) => {
              const itemAtivo = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setDropdownNav(null)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                    ${itemAtivo ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>
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
            <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest px-3 pb-1">Pessoas</p>
          </div>

          {(isAdmin ? subMenuColaboradoresAdm : subMenuColaboradoresGestao).map((item) => (
            <MenuItem key={item.href} item={item} />
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-0.5">
                <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest px-3 pb-1">Financeiro</p>
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
            <p className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest px-3 pb-1">Geral</p>
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
      {!isMobile && isAtendenteRole && (
        <div className="print:hidden sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 shadow-sm shadow-blue-900/20">
          <div className="flex items-center gap-1 px-4 py-2">
            <div className="flex items-center gap-2 mr-3 flex-shrink-0">
              <Logo size="sm" />
              <div className="hidden lg:block">
                <p className="font-bold text-white text-xs leading-tight">Clínica Abraço</p>
                <p title={identLabel} className="text-[9px] font-medium text-blue-200 leading-snug uppercase tracking-wider truncate max-w-[150px]">{identLabel}</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-wrap flex-1">
              {menuAtendente.map((item) => {
                const ativo = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                      ${ativo ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                    <span className="text-sm leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={alternarValores} title={valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                {valoresVisiveis ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <NotificacoesBell userRole={role} />
              <button onClick={() => setConfirmandoSaida(true)} title="Sair do sistema"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && isApoio && (
        <div className="print:hidden sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 shadow-sm shadow-blue-900/20">
          <div className="flex items-center gap-1 px-4 py-2">
            <div className="flex items-center gap-2 mr-3 flex-shrink-0">
              <Logo size="sm" />
              <div className="hidden lg:block">
                <p className="font-bold text-white text-xs leading-tight">Clínica Abraço</p>
                <p title={identLabel} className="text-[9px] font-medium text-blue-200 leading-snug uppercase tracking-wider truncate max-w-[150px]">{identLabel}</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-wrap flex-1">
              {menuApoio.map((item) => {
                const ativo = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                      ${ativo ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                    <span className="text-sm leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-1 flex-shrink-0">
              <NotificacoesBell userRole={role} />
              <button onClick={() => setConfirmandoSaida(true)} title="Sair do sistema"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && isEspecialista && (
        <div className="print:hidden sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 shadow-sm shadow-blue-900/20">
          <div className="flex items-center gap-1 px-4 py-2">
            <div className="flex items-center gap-2 mr-3 flex-shrink-0">
              <Logo size="sm" />
              <div className="hidden lg:block">
                <p className="font-bold text-white text-xs leading-tight">Clínica Abraço</p>
                <p title={identLabel} className="text-[9px] font-medium text-blue-200 leading-snug uppercase tracking-wider truncate max-w-[150px]">{identLabel}</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-wrap flex-1">
              {menuEspecialista.map((item) => {
                const ativo = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                      ${ativo ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                    <span className="text-sm leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-1 flex-shrink-0">
              <NotificacoesBell userRole={role} />
              <button onClick={() => setConfirmandoSaida(true)} title="Sair do sistema"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && isFamilia && (
        <div className="print:hidden sticky top-0 z-30 shadow-sm shadow-emerald-900/20"
          style={{ background: "linear-gradient(to right, #047857, #059669)" }}>
          <div className="flex items-center gap-1 px-4 py-2">
            <div className="flex items-center gap-2 mr-3 flex-shrink-0">
              <Logo size="sm" />
              <div className="hidden lg:block">
                <p className="font-bold text-white text-xs leading-tight">Clínica Abraço</p>
                <p title={identLabel} className="text-[9px] font-medium text-emerald-100 leading-snug uppercase tracking-wider truncate max-w-[150px]">{identLabel}</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-wrap flex-1">
              {menuFamilia.map((item) => {
                const ativo = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                      ${ativo ? "bg-white/20 text-white" : "text-emerald-50 hover:bg-white/10 hover:text-white"}`}>
                    <span className="text-sm leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-1 flex-shrink-0">
              <NotificacoesBell userRole={role} />
              <button onClick={() => setConfirmandoSaida(true)} title="Sair do sistema"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-50 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && isAdmin && (
        <div className="print:hidden sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 shadow-sm shadow-blue-900/20">
          <div className="flex items-center gap-1.5 px-4 py-2">
            <div className="flex items-center gap-2.5 mr-3 flex-shrink-0">
              <Logo size="sm" />
              <div className="hidden lg:block">
                <p className="font-bold text-white text-xs leading-tight"><Saudacao nome={userNome ?? undefined} /></p>
                <p className="text-[9px] font-medium text-blue-200 leading-snug uppercase tracking-wider">Clínica Abraço · {roleLabel}</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-shrink-0">
              <Link href="/adm/dashboard"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/adm/dashboard" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">📊</span><span>Dashboard</span>
              </Link>
              <Link href="/adm/colaboradores"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/adm/colaboradores" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">👥</span><span>Colaboradores</span>
              </Link>
              <NavDropdown id="financeiro" label="Financeiro" icon="💰" items={subMenuFinanceiro} />
              <NavDropdown id="rotina" label="Rotina" icon="🗓️" items={menuAdminRotina} />
              <NavDropdown id="sistema" label="Sistema" icon="⚙️" items={menuAdminSistema} />
            </nav>
            <div className="flex-1 min-w-0 flex items-center justify-center px-2">
              {paginaAtualAdm && (
                <p className="text-[11px] font-medium text-blue-200/80 truncate">
                  <span className="text-blue-300/60">Painel</span>
                  <span className="mx-1.5 text-blue-400/40">/</span>
                  <span className="text-blue-100">{paginaAtualAdm.icon} {paginaAtualAdm.label}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
              <div className="hidden md:flex items-center gap-1.5 text-[10px] font-semibold text-white bg-white/10 border border-white/20 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
              </div>
              <button onClick={alternarValores} title={valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                {valoresVisiveis ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <NotificacoesBell userRole={role} />
              <button onClick={() => setConfirmandoSaida(true)} title="Sair do sistema"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && isSupervisora && (
        <div className="print:hidden sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 shadow-sm shadow-blue-900/20">
          <div className="flex items-center gap-1.5 px-4 py-2">
            <div className="flex items-center gap-2.5 mr-3 flex-shrink-0">
              <Logo size="sm" />
              <div className="hidden lg:block">
                <p className="font-bold text-white text-xs leading-tight"><Saudacao nome={userNome ?? undefined} /></p>
                <p className="text-[9px] font-medium text-blue-200 leading-snug uppercase tracking-wider">Clínica Abraço · {roleLabel}</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-shrink-0">
              <Link href={menuSupervisoraInicial.href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === menuSupervisoraInicial.href ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">{menuSupervisoraInicial.icon}</span><span>{menuSupervisoraInicial.label}</span>
              </Link>
              <Link href="/supervisora/relatorio"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/supervisora/relatorio" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">📝</span><span>Registro ABC</span>
              </Link>
              <Link href="/escala"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/escala" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">📅</span><span>Escala</span>
              </Link>
              <NavDropdown id="clinico" label="Clínico" icon="🩺" items={menuSupervisoraClinico} />
              <NavDropdown id="apoio" label="Apoio" icon="🧰" items={menuSupervisoraApoio} />
            </nav>
            <div className="flex-1 min-w-0 flex items-center justify-center px-2">
              {paginaAtualSup && (
                <p className="text-[11px] font-medium text-blue-200/80 truncate">
                  <span className="text-blue-300/60">Painel</span>
                  <span className="mx-1.5 text-blue-400/40">/</span>
                  <span className="text-blue-100">{paginaAtualSup.icon} {paginaAtualSup.label}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
              <div className="hidden md:flex items-center gap-1.5 text-[10px] font-semibold text-white bg-white/10 border border-white/20 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
              </div>
              <NotificacoesBell userRole={role} />
              <button onClick={() => setConfirmandoSaida(true)} title="Sair do sistema"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && isAuxAdm && (
        <div className="print:hidden sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 shadow-sm shadow-blue-900/20">
          <div className="flex items-center gap-1.5 px-4 py-2">
            <div className="flex items-center gap-2.5 mr-3 flex-shrink-0">
              <Logo size="sm" />
              <div className="hidden lg:block">
                <p className="font-bold text-white text-xs leading-tight"><Saudacao nome={userNome ?? undefined} /></p>
                <p className="text-[9px] font-medium text-blue-200 leading-snug uppercase tracking-wider">Clínica Abraço · {roleLabel}</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-shrink-0">
              <Link href="/auxiliar/agenda"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/auxiliar/agenda" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">🗓️</span><span>Agenda</span>
              </Link>
              <Link href="/auxiliar/pauta"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/auxiliar/pauta" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">📆</span><span>Agenda Simone</span>
              </Link>
              <Link href="/escala"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/escala" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">📅</span><span>Escala</span>
              </Link>
              <NavDropdown id="cadastros" label="Cadastros" icon="🗂️" items={menuAuxAdmCadastros} />
              <NavDropdown id="apoio" label="Apoio" icon="🧰" items={menuAuxAdmApoio} />
            </nav>
            <div className="flex-1 min-w-0 flex items-center justify-center px-2">
              {paginaAtualAuxAdm && (
                <p className="text-[11px] font-medium text-blue-200/80 truncate">
                  <span className="text-blue-300/60">Painel</span>
                  <span className="mx-1.5 text-blue-400/40">/</span>
                  <span className="text-blue-100">{paginaAtualAuxAdm.icon} {paginaAtualAuxAdm.label}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
              <div className="hidden md:flex items-center gap-1.5 text-[10px] font-semibold text-white bg-white/10 border border-white/20 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
              </div>
              <NotificacoesBell userRole={role} />
              <button onClick={() => setConfirmandoSaida(true)} title="Sair do sistema"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && isGestao && (
        <div className="print:hidden sticky top-0 z-30 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 shadow-sm shadow-blue-900/20">
          <div className="flex items-center gap-1.5 px-4 py-2">
            <div className="flex items-center gap-2.5 mr-3 flex-shrink-0">
              <Logo size="sm" />
              <div className="hidden lg:block">
                <p className="font-bold text-white text-xs leading-tight"><Saudacao nome={userNome ?? undefined} /></p>
                <p className="text-[9px] font-medium text-blue-200 leading-snug uppercase tracking-wider">Clínica Abraço · {roleLabel}</p>
              </div>
            </div>
            <nav className="flex items-center gap-1 flex-shrink-0">
              <Link href="/gestao/dashboard"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/gestao/dashboard" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">📊</span><span>Dashboard</span>
              </Link>
              <Link href="/gestao/colaboradores"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/gestao/colaboradores" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">👥</span><span>Colaboradores</span>
              </Link>
              <Link href="/gestao/minha-agenda"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${pathname === "/gestao/minha-agenda" ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className="text-sm leading-none">🗓️</span><span>Minha Agenda</span>
              </Link>
              <NavDropdown id="atendimento" label="Atendimento" icon="🩺" items={menuGestaoAtendimento} />
              <NavDropdown id="rotina" label="Rotina" icon="🗓️" items={menuGestaoRotina} />
              <NavDropdown id="sistema" label="Sistema" icon="⚙️" items={menuGestaoSistema} />
            </nav>
            <div className="flex-1 min-w-0 flex items-center justify-center px-2">
              {paginaAtualGestao && (
                <p className="text-[11px] font-medium text-blue-200/80 truncate">
                  <span className="text-blue-300/60">Painel</span>
                  <span className="mx-1.5 text-blue-400/40">/</span>
                  <span className="text-blue-100">{paginaAtualGestao.icon} {paginaAtualGestao.label}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
              <div className="hidden md:flex items-center gap-1.5 text-[10px] font-semibold text-white bg-white/10 border border-white/20 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
              </div>
              <button onClick={alternarValores} title={valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                {valoresVisiveis ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <NotificacoesBell userRole={role} />
              <button onClick={() => setConfirmandoSaida(true)} title="Sair do sistema"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && !isAtendenteRole && !isAdmin && !isSupervisora && !isAuxAdm && !isGestao && !isEspecialista && !isFamilia && !isApoio && (
        <aside className="print:hidden w-56 bg-blue-50/40 border-r border-slate-200 h-screen sticky top-0 flex flex-col justify-between flex-shrink-0 overflow-y-auto">
          <div>
            <div className="px-4 py-4 bg-gradient-to-br from-blue-700 to-blue-500">
              <div className="flex items-center justify-between mb-2">
                <Logo size="md" />
                <NotificacoesBell userRole={role} align="left" />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-tight">Clínica Abraço</p>
                <p title={identLabel} className="text-[10px] font-medium text-blue-200 leading-snug uppercase tracking-wider truncate">{identLabel}</p>
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
          <div className="print:hidden fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm"
            style={{ background: isFamilia ? "linear-gradient(to right, #047857, #059669)" : "linear-gradient(to right, #1d4ed8, #3b82f6)" }}>
            <div className="flex items-center gap-2.5">
              <Logo size="sm" />
              <span className="font-bold text-white text-sm">Clínica Abraço</span>
            </div>
            <div className="flex items-center gap-1">
              {(isAdmin || isGestao || isAtendenteRole) && (
                <button onClick={alternarValores} title={valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition">
                  {valoresVisiveis ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}
              <NotificacoesBell userRole={role} />
              <button onClick={() => setMenuAberto(!menuAberto)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition">
                {menuAberto ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="flex items-start justify-between px-4 py-4"
              style={{ background: isFamilia ? "linear-gradient(to bottom right, #047857, #059669)" : "linear-gradient(to bottom right, #1d4ed8, #3b82f6)" }}>
              <div>
                <Logo size="md" />
                <p className="font-bold text-white text-sm mt-2">Clínica Abraço</p>
                <p title={identLabel} className={`text-[10px] font-medium leading-snug uppercase tracking-wider truncate max-w-[13rem] ${isFamilia ? "text-emerald-100" : "text-blue-200"}`}>{identLabel}</p>
              </div>
              <button onClick={() => setMenuAberto(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={`flex-1 overflow-y-auto ${isFamilia ? "bg-orange-50/40" : "bg-blue-50/40"}`}>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-8 sm:pt-24 overflow-y-auto"
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