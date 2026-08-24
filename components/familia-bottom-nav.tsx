"use client";

export type FamiliaTabId = "diario" | "comunicados" | "momentos" | "evolucao" | "conversas";

const ITENS: { id: FamiliaTabId; label: string; icon: string }[] = [
  { id: "diario",      label: "Diário",    icon: "📖" },
  { id: "comunicados", label: "Avisos",    icon: "💌" },
  { id: "momentos",    label: "Momentos",  icon: "📷" },
  { id: "evolucao",    label: "Evolução",  icon: "🌱" },
  { id: "conversas",   label: "Conversas", icon: "💬" },
];

export function FamiliaBottomNav({ ativa, onSelect }: { ativa: FamiliaTabId; onSelect: (id: FamiliaTabId) => void }) {
  return (
    <nav
      className="sm:hidden fixed bottom-0 z-40 bg-white border-t border-slate-200 flex px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-[0_-2px_10px_rgba(16,26,51,0.06)]"
      style={{ left: 0, right: 0 }}
    >
      {ITENS.map(item => {
        const ativo = ativa === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1"
          >
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-colors ${ativo ? "" : "text-slate-400"}`}
              style={ativo ? { background: "#ffb96d", color: "#9f2d00" } : undefined}
            >
              {item.icon}
            </span>
            <span
              className={`text-[10px] font-semibold truncate max-w-full ${ativo ? "" : "text-slate-400"}`}
              style={ativo ? { color: "#9f2d00" } : undefined}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
