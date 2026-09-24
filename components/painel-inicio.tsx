"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

// Peças comuns das telas "Início" (Aux. Adm, Especialista, Supervisora).
// Todas seguem a mesma grade: números em 4 colunas, painéis em metades ou
// quartos, cartões da mesma linha com a MESMA altura e conteúdo rolando por
// dentro — pedido da ADM pra nada ficar "fora de geometria".

export const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const diaSemanaDe = (d: Date) => DIAS_SEMANA[(d.getDay() + 6) % 7];

export function saudacaoPorHora() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

// "14:30 – 15:30" → minutos do início (parte 0) ou do fim (parte 1)
export function minutos(horario: string | null | undefined, parte: 0 | 1 = 0): number {
  const achados = (horario || "").match(/\d{1,2}:\d{2}/g);
  const h = achados?.[parte] ?? achados?.[0];
  if (!h) return 99999;
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
}

// Nome de criança da Escala é texto livre; o cadastro tem o nome oficial.
// Compara sem acento/maiúscula e aceita um ser o começo do outro
// ("Mel Chagas" × "Mel Chagas Sampaio Chaves de Farias").
export function normalizarNome(s: string | null | undefined) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
export function mesmoNome(a: string | null | undefined, b: string | null | undefined) {
  const x = normalizarNome(a), y = normalizarNome(b);
  return !!x && !!y && (x === y || x.startsWith(y + " ") || y.startsWith(x + " "));
}

export type ItemEscala = {
  id: string; horario: string; crianca: string; servico?: string | null;
  profissional_nome?: string | null; profissional_id?: string | null; local?: string | null;
  trocado: boolean; cancelado: boolean;
};

// Escala do dia = molde semanal + trocas/cancelamentos daquela data (mesma
// regra da tela Escala). Cancelados continuam na lista, marcados.
export function montarEscalaDoDia(slots: any[], excecoes: any[]): ItemEscala[] {
  const excPorSlot: Record<string, any> = {};
  const avulsas: any[] = [];
  excecoes.forEach((e) => (e.escala_id ? (excPorSlot[e.escala_id] = e) : avulsas.push(e)));
  return [
    ...slots.map((s) => {
      const e = excPorSlot[s.id];
      return {
        id: s.id,
        horario: e?.horario ?? s.horario,
        crianca: e?.crianca ?? s.crianca,
        servico: e?.servico ?? s.servico,
        profissional_nome: e?.profissional_nome ?? s.profissional_nome,
        profissional_id: e?.profissional_id ?? s.profissional_id,
        local: e?.local ?? s.local,
        trocado: !!e && !e.cancelado,
        cancelado: !!e?.cancelado,
      };
    }),
    ...avulsas.filter((e) => !e.cancelado).map((e) => ({
      id: e.id, horario: e.horario || "", crianca: e.crianca || "", servico: e.servico,
      profissional_nome: e.profissional_nome, profissional_id: e.profissional_id, local: e.local,
      trocado: true, cancelado: false,
    })),
  ].sort((a, b) => minutos(a.horario) - minutos(b.horario));
}

// Situação de um atendimento em relação à hora atual
export function situacao(i: ItemEscala, agoraMin: number) {
  const ini = minutos(i.horario, 0);
  const fimBruto = minutos(i.horario, 1);
  const fim = fimBruto === ini ? ini + 60 : fimBruto;
  if (i.cancelado) return { rotulo: "Cancelado hoje", cor: "bg-slate-100 text-slate-500", agora: false, passou: false };
  if (!i.profissional_nome?.trim()) return { rotulo: "Sem profissional", cor: "bg-rose-50 text-rose-600", agora: false, passou: false };
  if (agoraMin >= ini && agoraMin < fim) return { rotulo: "Agora", cor: "bg-blue-100 text-blue-800", agora: true, passou: false };
  if (i.trocado) return { rotulo: "Trocado hoje", cor: "bg-amber-50 text-amber-700", agora: false, passou: agoraMin >= fim };
  if (agoraMin >= fim) return { rotulo: "Concluído", cor: "bg-teal-50 text-teal-700", agora: false, passou: true };
  return { rotulo: "A seguir", cor: "bg-blue-50 text-blue-700", agora: false, passou: false };
}

export function Saudacao({ nome, subtitulo }: { nome: string; subtitulo: string }) {
  return (
    <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 rounded-2xl px-5 sm:px-6 py-5 text-white flex flex-wrap items-center justify-between gap-3 shadow-sm">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold">{saudacaoPorHora()}{nome ? `, ${nome}` : ""}!</h1>
        <p className="text-sm text-blue-200 mt-0.5 first-letter:uppercase">{subtitulo}</p>
      </div>
      <span className="flex items-center gap-2 text-xs font-semibold bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Ao vivo
      </span>
    </div>
  );
}

export type Numero = { label: string; valor: number; sub: string; alerta?: boolean };
export function Numeros({ itens }: { itens: Numero[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {itens.map((k) => (
        <div key={k.label} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 min-w-0">
          {/* Título pode quebrar em 2 linhas no celular; os cartões da mesma linha da grade esticam juntos */}
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{k.label}</p>
          <p className="text-3xl font-extrabold text-blue-900 tabular-nums leading-tight">{k.valor}</p>
          <p className={`text-xs truncate ${k.alerta ? "text-rose-600 font-semibold" : "text-slate-500"}`}>{k.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function Divisor({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-2">
      <span className="w-2 h-2 rounded-full bg-blue-700" />
      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-900">{label}</span>
      <span className="flex-1 h-px bg-slate-300" />
    </div>
  );
}

// No computador a altura é fixa (linha alinhada); no celular os cartões
// empilham e ganham só um teto, pra lista não ficar gigante.
export function Painel({ titulo, sub, href, linkLabel, altura, topo, icone, iconeBg, className = "", tetoCelular = true, children }: {
  titulo: string; sub?: string; href?: string; linkLabel?: string; altura: string;
  topo?: ReactNode; icone?: string; iconeBg?: string; className?: string; tetoCelular?: boolean; children: ReactNode;
}) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col min-w-0 ${tetoCelular ? "max-h-[420px] md:max-h-none" : ""} ${altura} ${className}`}>
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-slate-100">
        <div className="min-w-0">
          {/* Título numa linha só: se quebrar, o cabeçalho fica mais alto que o do cartão vizinho */}
          <h2 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2 whitespace-nowrap">
            {icone && <span className={`w-6 h-6 rounded-lg ${iconeBg} flex items-center justify-center text-[13px] flex-shrink-0`}>{icone}</span>}
            {titulo}
          </h2>
          {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
        </div>
        {href && <Link href={href} className="text-xs font-bold text-blue-700 hover:underline whitespace-nowrap flex-shrink-0">{linkLabel}</Link>}
      </header>
      {topo}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </section>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <div className="h-full min-h-[120px] flex items-center justify-center px-6 text-center text-sm text-slate-400">{texto}</div>;
}

export type Pendencia = { id: string; nivel: "urgente" | "atencao" | "info"; titulo: string; detalhe: string; href: string; acao: string };
const ordemNivel = (n: Pendencia["nivel"]) => (n === "urgente" ? 0 : n === "atencao" ? 1 : 2);

export function ListaPendencias({ itens, vazio = "Tudo em dia por aqui. ✨" }: { itens: Pendencia[]; vazio?: string }) {
  if (itens.length === 0) return <Vazio texto={vazio} />;
  return (
    <ul className="py-1">
      {[...itens].sort((a, b) => ordemNivel(a.nivel) - ordemNivel(b.nivel)).map((p) => (
        <li key={p.id} className="grid grid-cols-[10px_1fr_auto] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0">
          <span className={`w-2.5 h-2.5 rounded-full ${p.nivel === "urgente" ? "bg-rose-600" : p.nivel === "atencao" ? "bg-amber-500" : "bg-blue-500"}`} />
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-800">{p.titulo}</p>
            <p className="text-xs text-slate-500 truncate">{p.detalhe}</p>
          </div>
          <Link href={p.href} className="text-xs font-bold text-blue-700 hover:underline whitespace-nowrap">{p.acao}</Link>
        </li>
      ))}
    </ul>
  );
}

// Já terminou pelo relógio (vale também pra cancelado, que sai junto com os concluídos)
function jaPassou(i: ItemEscala, agoraMin: number) {
  const ini = minutos(i.horario, 0);
  const fimBruto = minutos(i.horario, 1);
  return agoraMin >= (fimBruto === ini ? ini + 60 : fimBruto);
}

const LIMITE_CELULAR = 5;

// Lista da escala do dia. `mostrarProfissional` = false na tela da própria
// especialista (é sempre ela). Com ~30 atendimentos por dia, os que já
// terminaram ficam escondidos atrás de "Ver concluídos" — assim o que está
// acontecendo agora fica no topo. No celular mostra só os 5 próximos e manda
// pra Escala completa (evita rolagem dentro da rolagem).
export function ListaEscala({ itens, agoraMin, mostrarProfissional = true, vazio, hrefTodos }: {
  itens: ItemEscala[]; agoraMin: number; mostrarProfissional?: boolean; vazio: string; hrefTodos: string;
}) {
  const [verConcluidos, setVerConcluidos] = useState(false);
  if (itens.length === 0) return <Vazio texto={vazio} />;

  const passados = itens.filter((i) => jaPassou(i, agoraMin));
  const pendentes = itens.filter((i) => !jaPassou(i, agoraMin));
  const agora = pendentes.filter((i) => situacao(i, agoraMin).agora).length;
  const visiveis = verConcluidos ? itens : pendentes;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50/70 border-b border-slate-100 text-xs">
        <span className="text-slate-500">
          <b className="text-teal-700">{passados.length}</b> concluído{passados.length === 1 ? "" : "s"} ·{" "}
          <b className="text-blue-800">{agora}</b> agora ·{" "}
          <b className="text-slate-700">{pendentes.length - agora}</b> a seguir
        </span>
        {passados.length > 0 && (
          <button type="button" onClick={() => setVerConcluidos((v) => !v)}
            className="font-bold text-blue-700 hover:underline">
            {verConcluidos ? "Esconder concluídos" : `Ver concluídos (${passados.length})`}
          </button>
        )}
      </div>

      {visiveis.length === 0 ? (
        <Vazio texto="Todos os atendimentos de hoje já terminaram." />
      ) : (
        <ul className="py-1">
          {visiveis.map((i, idx) => (
            <LinhaEscala key={i.id} i={i} agoraMin={agoraMin} mostrarProfissional={mostrarProfissional}
              soComputador={idx >= LIMITE_CELULAR} />
          ))}
        </ul>
      )}

      {visiveis.length > LIMITE_CELULAR && (
        <Link href={hrefTodos} className="md:hidden block text-center text-xs font-bold text-blue-700 py-3 border-t border-slate-100">
          Ver todos os {visiveis.length} na Escala →
        </Link>
      )}
    </div>
  );
}

function LinhaEscala({ i, agoraMin, mostrarProfissional, soComputador }: {
  i: ItemEscala; agoraMin: number; mostrarProfissional: boolean; soComputador: boolean;
}) {
    const s = situacao(i, agoraMin);
    const [hIni, hFim] = i.horario.split(/\s*[–-]\s*/);
    return (
      <li className={`${soComputador ? "hidden md:grid" : "grid"} grid-cols-[56px_1fr] sm:grid-cols-[56px_1fr_auto] gap-x-3 gap-y-1 items-center px-4 py-2.5 border-b border-slate-100 last:border-0 ${s.agora ? "bg-gradient-to-r from-blue-50 to-white" : ""}`}>
        <span className={`text-[13px] font-extrabold tabular-nums ${i.cancelado ? "text-slate-400 line-through" : "text-blue-900"}`}>
          {hIni}
          {hFim && <span className="block text-[11px] font-medium text-slate-400">até {hFim}</span>}
        </span>
        <div className="min-w-0">
          <p className={`text-[13px] font-bold truncate ${i.cancelado ? "text-slate-400 line-through" : "text-slate-800"}`}>{i.crianca}</p>
          <p className="text-xs text-slate-500 truncate">
            {[i.servico?.trim(), mostrarProfissional ? i.profissional_nome?.trim() : null, i.local || "Clínica"].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className={`col-start-2 sm:col-start-auto justify-self-start sm:justify-self-end text-[11px] font-bold rounded-full px-2.5 py-0.5 whitespace-nowrap ${s.cor}`}>
          {s.rotulo}
        </span>
      </li>
    );
}

export type Mini = { id: string; marca: string; titulo: string; detalhe?: string; corMarca?: string };
export function ListaMini({ itens, vazio }: { itens: Mini[]; vazio: string }) {
  if (itens.length === 0) return <Vazio texto={vazio} />;
  return (
    <ul className="px-4 py-3 space-y-2.5">
      {itens.map((m) => (
        <li key={m.id} className="grid grid-cols-[46px_1fr] gap-2.5 items-baseline">
          <span className={`text-xs font-extrabold tabular-nums ${m.corMarca || "text-blue-900"}`}>{m.marca}</span>
          <span className="text-[13px] font-semibold text-slate-800 min-w-0 break-words">
            {m.titulo}
            {m.detalhe && <span className="block text-xs font-medium text-slate-500">{m.detalhe}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Atalhos({ itens }: { itens: { href: string; label: string; icon: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {itens.map((a) => (
        <Link key={a.href} href={a.href}
          className="group bg-white rounded-2xl shadow-sm border border-transparent hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 p-3 flex items-center gap-3 text-[13px] font-bold text-slate-800 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-base group-hover:scale-110 transition-transform flex-shrink-0">{a.icon}</span>
          {/* No celular (2 colunas) o nome quebra em 2 linhas em vez de cortar com "…" */}
          <span className="leading-tight">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

// Filtro Todos/Clínica/Escola/Casa usado em cima das listas de escala
export const LOCAIS = ["Clínica", "Escola", "Casa"] as const;
export function FiltroLocal({ valor, onChange, contar }: { valor: string; onChange: (v: string) => void; contar: (l: string) => number }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pt-3">
      {["Todos", ...LOCAIS].map((l) => {
        const ativo = valor === l;
        return (
          <button key={l} type="button" onClick={() => onChange(l)} aria-pressed={ativo}
            className={`text-xs font-bold rounded-full px-3 py-1 border transition ${ativo ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"}`}>
            {l} · {contar(l)}
          </button>
        );
      })}
    </div>
  );
}

// Relógio do painel: atualiza "Agora/Concluído" a cada minuto sem recarregar
export function useAgoraMin() {
  const calc = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const [agora, setAgora] = useState(calc);
  useEffect(() => { const t = setInterval(() => setAgora(calc()), 60_000); return () => clearInterval(t); }, []);
  return agora;
}
