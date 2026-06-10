export type MockupTipo =
  | "dashboard"
  | "lista-cards"
  | "mural"
  | "protocolos"
  | "chat"
  | "escala"
  | "tabela"
  | "form-lista"
  | "financeiro"
  | "agenda-semana"
  | "abas"
  | "form-simples"
  | "form-etapas";

const CORES = {
  bg: "#f8fafc",
  branco: "#ffffff",
  borda: "#e2e8f0",
  bordaClara: "#f1f5f9",
  linha: "#cbd5e1",
  linhaForte: "#94a3b8",
  azul: "#3b82f6",
  azulClaro: "#dbeafe",
  verde: "#10b981",
  verdeClaro: "#d1fae5",
  amarelo: "#fbbf24",
  amareloClaro: "#fef3c7",
  roxo: "#8b5cf6",
  roxoClaro: "#ede9fe",
  vermelhoClaro: "#fecaca",
  vermelhoClaro2: "#fee2e2",
};

function Dashboard() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${10 + i * 78}, 10)`}>
          <rect width="70" height="40" rx="6" fill={CORES.branco} stroke={CORES.borda} />
          <rect x="8" y="8" width="30" height="8" rx="2" fill={CORES.azul} />
          <rect x="8" y="22" width="40" height="6" rx="2" fill={CORES.linha} />
        </g>
      ))}
      <g transform="translate(10,60)">
        <rect width="150" height="100" rx="6" fill={CORES.branco} stroke={CORES.borda} />
        <rect x="10" y="10" width="60" height="6" rx="2" fill={CORES.linhaForte} />
        <polyline points="10,85 40,65 70,75 100,35 130,50" fill="none" stroke={CORES.verde} strokeWidth="3" />
      </g>
      <g transform="translate(170,60)">
        <rect width="140" height="100" rx="6" fill={CORES.branco} stroke={CORES.borda} />
        <rect x="15" y="10" width="60" height="6" rx="2" fill={CORES.linhaForte} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={15 + i * 24} y={90 - (20 + i * 12)} width="14" height={20 + i * 12} rx="2" fill={CORES.azul} />
        ))}
      </g>
    </svg>
  );
}

function ListaCards() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      <rect x="10" y="10" width="300" height="20" rx="10" fill={CORES.branco} stroke={CORES.borda} />
      <circle cx="22" cy="20" r="4" fill={CORES.linha} />
      <rect x="32" y="17" width="80" height="6" rx="2" fill={CORES.linha} />
      {[0, 1, 2, 3].map((i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return (
          <g key={i} transform={`translate(${10 + col * 155}, ${42 + row * 65})`}>
            <rect width="145" height="55" rx="8" fill={CORES.branco} stroke={CORES.borda} />
            <circle cx="20" cy="27" r="12" fill={CORES.azulClaro} />
            <rect x="40" y="16" width="80" height="7" rx="2" fill={CORES.linhaForte} />
            <rect x="40" y="30" width="60" height="6" rx="2" fill={CORES.linha} />
            <rect x="40" y="40" width="40" height="8" rx="4" fill={CORES.azulClaro} />
          </g>
        );
      })}
    </svg>
  );
}

function Mural() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      <rect x="220" y="8" width="90" height="18" rx="9" fill={CORES.azul} />
      <rect x="232" y="13" width="66" height="8" rx="2" fill={CORES.branco} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(10, ${36 + i * 46})`}>
          <rect width="300" height="40" rx="8" fill={CORES.branco} stroke={i === 0 ? CORES.amarelo : CORES.borda} strokeWidth={i === 0 ? 2 : 1} />
          {i === 0 && <circle cx="16" cy="14" r="5" fill={CORES.amarelo} />}
          <rect x="14" y="10" width="120" height="8" rx="2" fill={CORES.linhaForte} />
          <rect x="14" y="24" width="220" height="6" rx="2" fill={CORES.bordaClara} />
        </g>
      ))}
    </svg>
  );
}

function Protocolos() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={10 + i * 78} y="8" width="70" height="18" rx="9" fill={i === 0 ? CORES.azul : CORES.branco} stroke={CORES.borda} />
      ))}
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(10, ${36 + i * 65})`}>
          <rect width="300" height="55" rx="8" fill={CORES.branco} stroke={CORES.borda} />
          <rect x="14" y="12" width="160" height="8" rx="2" fill={CORES.linhaForte} />
          <rect x="14" y="28" width="220" height="6" rx="2" fill={CORES.bordaClara} />
          <rect x="14" y="40" width="220" height="6" rx="2" fill={CORES.bordaClara} />
          <rect x="240" y="11" width="50" height="16" rx="8" fill={CORES.verdeClaro} />
        </g>
      ))}
    </svg>
  );
}

function Chat() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      <rect x="6" y="6" width="100" height="158" rx="8" fill={CORES.branco} stroke={CORES.borda} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(14, ${16 + i * 36})`}>
          <circle cx="10" cy="10" r="10" fill={CORES.azulClaro} />
          <rect x="28" y="4" width="60" height="6" rx="2" fill={CORES.linhaForte} />
          <rect x="28" y="14" width="40" height="5" rx="2" fill={CORES.bordaClara} />
        </g>
      ))}
      <rect x="114" y="6" width="200" height="158" rx="8" fill={CORES.bg} stroke={CORES.borda} />
      <rect x="124" y="20" width="110" height="22" rx="11" fill={CORES.bordaClara} />
      <rect x="190" y="50" width="120" height="22" rx="11" fill={CORES.azul} />
      <rect x="124" y="80" width="90" height="22" rx="11" fill={CORES.bordaClara} />
      <rect x="124" y="140" width="180" height="16" rx="8" fill={CORES.branco} stroke={CORES.borda} />
    </svg>
  );
}

function Escala() {
  const cores = [CORES.azulClaro, CORES.verdeClaro, CORES.amareloClaro, CORES.roxoClaro];
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      <rect x="6" y="6" width="40" height="16" rx="4" fill={CORES.branco} stroke={CORES.borda} />
      {["Seg", "Ter", "Qua", "Qui", "Sex"].map((_, i) => (
        <rect key={i} x={50 + i * 52} y="6" width="48" height="16" rx="4" fill={CORES.azul} />
      ))}
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x="6" y={28 + r * 34} width="40" height="28" rx="4" fill={CORES.branco} stroke={CORES.borda} />
          {[0, 1, 2, 3, 4].map((c) => {
            const show = (r + c) % 2 === 0;
            return show ? (
              <rect key={c} x={50 + c * 52} y={28 + r * 34} width="48" height="28" rx="4" fill={cores[(r + c) % 4]} />
            ) : (
              <rect key={c} x={50 + c * 52} y={28 + r * 34} width="48" height="28" rx="4" fill={CORES.branco} stroke={CORES.bordaClara} />
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function Tabela() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      <rect x="10" y="8" width="200" height="18" rx="9" fill={CORES.branco} stroke={CORES.borda} />
      <rect x="220" y="8" width="90" height="18" rx="9" fill={CORES.branco} stroke={CORES.borda} />
      <rect x="10" y="34" width="300" height="18" rx="4" fill={CORES.bordaClara} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(10, ${56 + i * 22})`}>
          <rect width="300" height="18" rx="4" fill={CORES.branco} stroke={CORES.bordaClara} />
          <rect x="8" y="6" width="90" height="6" rx="2" fill={CORES.linhaForte} />
          <rect x="120" y="6" width="60" height="6" rx="2" fill={CORES.linha} />
          <rect x="250" y="4" width="40" height="10" rx="5" fill={CORES.azulClaro} />
        </g>
      ))}
    </svg>
  );
}

function FormLista() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      <rect x="10" y="6" width="300" height="58" rx="8" fill={CORES.branco} stroke={CORES.borda} />
      {[0, 1, 2].map((i) => (
        <rect key={`a${i}`} x={18 + i * 98} y="16" width="88" height="14" rx="4" fill={CORES.bordaClara} />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={`b${i}`} x={18 + i * 98} y="36" width="88" height="14" rx="4" fill={CORES.bordaClara} />
      ))}
      <rect x="230" y="44" width="70" height="14" rx="7" fill={CORES.azul} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(10, ${74 + i * 30})`}>
          <rect width="300" height="24" rx="6" fill={CORES.branco} stroke={CORES.borda} />
          <circle cx="16" cy="12" r="8" fill={CORES.azulClaro} />
          <rect x="32" y="8" width="120" height="7" rx="2" fill={CORES.linhaForte} />
          <rect x="270" y="8" width="10" height="10" rx="2" fill={CORES.linha} />
          <rect x="285" y="8" width="10" height="10" rx="2" fill={CORES.vermelhoClaro} />
        </g>
      ))}
    </svg>
  );
}

function Financeiro() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${10 + i * 102}, 8)`}>
          <rect width="96" height="40" rx="6" fill={CORES.branco} stroke={CORES.borda} />
          <rect x="8" y="8" width="50" height="6" rx="2" fill={CORES.linha} />
          <rect x="8" y="20" width="40" height="10" rx="2" fill={i === 1 ? CORES.verde : CORES.azul} />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(10, ${56 + i * 26})`}>
          <rect width="300" height="20" rx="5" fill={CORES.branco} stroke={CORES.bordaClara} />
          <rect x="8" y="6" width="140" height="7" rx="2" fill={CORES.linhaForte} />
          <rect x="180" y="5" width="50" height="9" rx="2" fill={CORES.linha} />
          <rect x="245" y="4" width="55" height="12" rx="6" fill={i % 2 === 0 ? CORES.verdeClaro : CORES.vermelhoClaro2} />
        </g>
      ))}
    </svg>
  );
}

function AgendaSemana() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      <rect x="10" y="6" width="20" height="16" rx="4" fill={CORES.branco} stroke={CORES.borda} />
      <rect x="290" y="6" width="20" height="16" rx="4" fill={CORES.branco} stroke={CORES.borda} />
      <rect x="120" y="6" width="80" height="16" rx="4" fill={CORES.bordaClara} />
      {Array.from({ length: 7 }).map((_, i) => (
        <g key={i} transform={`translate(${8 + i * 44}, 30)`}>
          <rect width="40" height="16" rx="4" fill={i === 2 ? CORES.azul : CORES.borda} />
          <rect width="40" height="120" y="20" rx="4" fill={CORES.branco} stroke={CORES.bordaClara} />
          {i % 3 !== 1 && <rect x="4" y="28" width="32" height="14" rx="3" fill={CORES.azulClaro} />}
          {i % 2 === 0 && <rect x="4" y="48" width="32" height="14" rx="3" fill={CORES.verdeClaro} />}
          {i % 4 === 0 && <rect x="4" y="68" width="32" height="14" rx="3" fill={CORES.amareloClaro} />}
        </g>
      ))}
    </svg>
  );
}

function Abas() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      {["Diário", "Avisos", "Momentos", "Evolução"].map((_, i) => (
        <rect key={i} x={10 + i * 78} y="6" width="72" height="20" rx="6" fill={i === 0 ? CORES.azul : CORES.branco} stroke={CORES.borda} />
      ))}
      <rect x="10" y="36" width="300" height="16" rx="4" fill={CORES.bordaClara} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(10, ${58 + i * 36})`}>
          <rect width="300" height="30" rx="6" fill={CORES.branco} stroke={CORES.borda} />
          <rect x="10" y="8" width="40" height="14" rx="3" fill={CORES.roxoClaro} />
          <rect x="60" y="10" width="160" height="6" rx="2" fill={CORES.linhaForte} />
          <rect x="60" y="20" width="100" height="5" rx="2" fill={CORES.bordaClara} />
        </g>
      ))}
    </svg>
  );
}

function FormSimples() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${10 + i * 155}, 6)`}>
          <rect width="145" height="34" rx="6" fill={CORES.branco} stroke={CORES.borda} />
          <rect x="8" y="8" width="60" height="6" rx="2" fill={CORES.linha} />
          <rect x="8" y="18" width="40" height="10" rx="2" fill={CORES.azul} />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(10, ${48 + i * 26})`}>
          <rect width="80" height="6" rx="2" fill={CORES.linhaForte} />
          <rect y="10" width="300" height="14" rx="4" fill={CORES.branco} stroke={CORES.borda} />
        </g>
      ))}
      <rect x="220" y="156" width="90" height="14" rx="7" fill={CORES.azul} />
    </svg>
  );
}

function FormEtapas() {
  return (
    <svg viewBox="0 0 320 170" className="w-full h-auto">
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx={40 + i * 80} cy="14" r="10" fill={i === 0 ? CORES.azul : CORES.borda} />
          {i < 3 && <rect x={50 + i * 80} y="12" width="60" height="3" fill={CORES.borda} />}
        </g>
      ))}
      <rect x="10" y="36" width="300" height="100" rx="8" fill={CORES.branco} stroke={CORES.borda} />
      <rect x="22" y="48" width="120" height="8" rx="2" fill={CORES.linhaForte} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="22" y={64 + i * 20} width="276" height="14" rx="4" fill={CORES.bordaClara} />
      ))}
      <rect x="10" y="148" width="80" height="16" rx="8" fill={CORES.branco} stroke={CORES.borda} />
      <rect x="230" y="148" width="80" height="16" rx="8" fill={CORES.azul} />
    </svg>
  );
}

const COMPONENTES: Record<MockupTipo, () => React.JSX.Element> = {
  "dashboard": Dashboard,
  "lista-cards": ListaCards,
  "mural": Mural,
  "protocolos": Protocolos,
  "chat": Chat,
  "escala": Escala,
  "tabela": Tabela,
  "form-lista": FormLista,
  "financeiro": Financeiro,
  "agenda-semana": AgendaSemana,
  "abas": Abas,
  "form-simples": FormSimples,
  "form-etapas": FormEtapas,
};

export function AjudaMockup({ tipo }: { tipo: MockupTipo }) {
  const Componente = COMPONENTES[tipo];
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-3">
      <Componente />
    </div>
  );
}
