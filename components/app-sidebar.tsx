"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Menu, 
  Home, 
  Users, 
  Wallet, 
  MessageCircle, 
  ClipboardList, 
  PlusSquare, 
  Baby,
  LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

type Role = "adm" | "atendente";

const menuByRole = {
  adm: [
    { href: "/adm/dashboard", label: "Dashboard", icon: Home },
    { href: "/adm/dashboard/atendentes", label: "Gestão Atendentes", icon: Users },
    { href: "/adm/criancas", label: "Gestão Crianças", icon: Baby }, 
    { href: "/adm/financeiro", label: "Financeiro / Faturamento", icon: Wallet },
    { href: "/chat", label: "Chat", icon: MessageCircle },
  ],
  atendente: [
    { href: "/atendente/novo-registro", label: "Novo Registro", icon: PlusSquare },
    { href: "/atendente/meus-atendimentos", label: "Meus Atendimentos", icon: ClipboardList },
    { href: "/chat", label: "Chat", icon: MessageCircle },
  ],
};

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menu = menuByRole[role] || [];

  const [usuarioNome, setUsuarioNome] = useState("");
  const [inicialNome, setInicialNome] = useState("U");

  useEffect(() => {
    async function obterUsuario() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const nomeMetadados = user.user_metadata?.full_name || user.user_metadata?.nome;
        const parteEmail = user.email ? user.email.split('@')[0] : '';
        const nomeFinal = nomeMetadados || parteEmail || user.email || role;

        setUsuarioNome(nomeFinal);
        setInicialNome(nomeFinal.charAt(0).toUpperCase());
      } else {
        setUsuarioNome(role);
        setInicialNome(role.charAt(0).toUpperCase());
      }
    }
    obterUsuario();
  }, [role]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Header Mobile */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-blue-100 bg-white px-4 py-3">
        <p className="font-semibold text-blue-800">Clínica ABRAÇO</p>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-blue-100 bg-white p-4 transition-transform md:translate-x-0 shadow-sm",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Card Superior */}
        <div className="mb-6 rounded-lg bg-blue-900 p-4 text-white shadow-md">
          <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest">Painel {role === 'adm' ? 'Administrador' : 'Atendente'}</p>
          <h1 className="text-lg font-black tracking-tight">Clínica ABRAÇO</h1>
        </div>

        <nav className="space-y-1">
          {menu.map((item) => {
            const Icon = item.icon;
            
            // 🟢 CORRIGIDO: Validação exata do link para evitar que o Next.js busque subpastas (/novo)
            const active = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                  active 
                    ? "bg-blue-600 text-white shadow-blue-200 shadow-lg translate-x-1" 
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-white" : "text-slate-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* RODAPÉ DE PERFIL */}
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm uppercase shadow-sm shrink-0">
              {inicialNome}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuário Ativo</p>
              <p className="text-xs font-black text-slate-800 truncate capitalize">
                {usuarioNome}
              </p>
            </div>
            
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
              title="Sair do sistema"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}