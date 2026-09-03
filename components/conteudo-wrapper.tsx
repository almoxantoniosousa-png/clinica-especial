"use client";

import { usePathname } from "next/navigation";

// Dashboard do ADM e da Gestao se beneficiam de mais largura (varios
// cards/graficos lado a lado) -- as demais telas continuam centralizadas
// numa coluna confortavel de leitura.
const ROTAS_LARGURA_TOTAL = ["/adm/dashboard", "/gestao/dashboard"];

export function ConteudoWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const larguraTotal = ROTAS_LARGURA_TOTAL.includes(pathname);

  return (
    <div className={`relative z-10 mx-auto p-4 md:p-8 h-full ${larguraTotal ? "max-w-full" : "max-w-5xl"}`}>
      {children}
    </div>
  );
}
