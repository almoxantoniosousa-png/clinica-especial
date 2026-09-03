"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ValoresVisiveisContextType = {
  visivel: boolean;
  alternar: () => void;
};

const ValoresVisiveisContext = createContext<ValoresVisiveisContextType | null>(null);

// Sempre comeca fechado (sem persistir em localStorage de proposito) --
// pedido explicito: toda vez que abrir o sistema, os valores ja vem
// ocultos, sem depender de lembrar a preferencia da ultima sessao.
export function ValoresVisiveisProvider({ children }: { children: ReactNode }) {
  const [visivel, setVisivel] = useState(false);
  const alternar = () => setVisivel((v) => !v);

  return (
    <ValoresVisiveisContext.Provider value={{ visivel, alternar }}>
      {children}
    </ValoresVisiveisContext.Provider>
  );
}

export function useValoresVisiveis() {
  const ctx = useContext(ValoresVisiveisContext);
  if (!ctx) throw new Error("useValoresVisiveis precisa estar dentro de ValoresVisiveisProvider");
  return ctx;
}

// Componente pra mascarar um valor monetario/sensivel -- envolve o valor
// ja formatado (ex: <Valor>R$ 1.234,56</Valor>) e troca por bolinhas
// quando o modo oculto estiver ativo.
export function Valor({ children }: { children: ReactNode }) {
  const { visivel } = useValoresVisiveis();
  if (visivel) return <>{children}</>;
  return <span aria-hidden="true" className="tracking-widest select-none">••••••</span>;
}
