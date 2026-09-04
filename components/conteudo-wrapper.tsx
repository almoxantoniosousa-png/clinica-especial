"use client";

import { usePathname } from "next/navigation";

// Toda a area exclusiva do ADM (Solange), da Gestao (Simone), dos ATs e
// das Supervisoras ganhou largura total, a pedido deles -- inclui tudo em
// /adm/*, /gestao/*, /atendente/* e /supervisora/*. Telas compartilhadas
// com outros perfis (Mural, Chat, Escala...) continuam centralizadas, pra
// nao mudar a largura dessas paginas pra quem nao e desses perfis.
export function ConteudoWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const larguraTotal = pathname.startsWith("/adm") || pathname.startsWith("/gestao") || pathname.startsWith("/atendente") || pathname.startsWith("/supervisora");

  return (
    <div className={`relative z-10 mx-auto p-4 md:p-8 h-full ${larguraTotal ? "max-w-full" : "max-w-5xl"}`}>
      {children}
    </div>
  );
}
