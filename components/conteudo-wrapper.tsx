"use client";

import { usePathname } from "next/navigation";

// Toda a area exclusiva do ADM (Solange) ganhou largura total, a pedido
// dela -- inclui tudo em /adm/*. A Gestao (Simone) por enquanto fica so
// com o Dashboard largo, o resto das telas dela (compartilhadas com
// outros perfis, tipo Mural/Chat) continua centralizado, pra nao mudar
// a largura dessas paginas pra quem nao e ADM.
const ROTA_LARGURA_TOTAL_EXATA = "/gestao/dashboard";

export function ConteudoWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const larguraTotal = pathname.startsWith("/adm") || pathname === ROTA_LARGURA_TOTAL_EXATA;

  return (
    <div className={`relative z-10 mx-auto p-4 md:p-8 h-full ${larguraTotal ? "max-w-full" : "max-w-5xl"}`}>
      {children}
    </div>
  );
}
