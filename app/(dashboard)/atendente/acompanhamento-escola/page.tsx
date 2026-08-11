"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { hojeLocal } from "@/lib/dataUtils";
import { FileText, Plus, ArrowLeft, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

type Crianca = { id: string; nome: string };

// Bloco Antecedente → Comportamento → Consequência, reaproveitado no período
// de aula, no intervalo e (quando marcado algo) no lanche. Só aparece de
// verdade quando algum comportamento interferente é marcado — na maioria das
// aulas não acontece nada, então fica tudo fechado/rápido de marcar.
type BlocoABC = {
  comportamentos: string[];
  antecedente: string[];
  antecedente_outro: string;
  consequencia: string[];
  consequencia_outro: string;
  local: string;
  com_quem: string[];
  hora_inicio: string;
  hora_fim: string;
};

type Periodo = { nome: string; hora_inicio: string; tema: string; abc: BlocoABC };

type Lanche = { origem: string; sentado: string; comeu: string; suco: string; obs: string };

type Conteudo = {
  contexto: "escola" | "casa";
  data: string;
  hora_chegada: string;
  periodos: Periodo[];
  intervalo: BlocoABC & { brincou_com: string };
  lanche: Lanche;
  observacoes_gerais: string;
};

type Registro = {
  id: string;
  crianca_id: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  feedback_gestao: string | null;
  feedback_por: string | null;
  feedback_em: string | null;
  criancas?: { nome: string };
};

const COMPORTAMENTOS = [
  "Chorou", "Gritou", "Recusou fazer atividade", "Pegou item de colega/irmão",
  "Brigou com colega/irmão", "Insistiu na interação com colega/irmão",
  "Saiu do ambiente sem autorização", "Correu pelo ambiente", "Empurrou/agrediu",
  "Reclamou", "Resmungou", "Fez queixa", "Outro",
];

const ANTECEDENTES = [
  "Atividade/tarefa proposta", "Transição de atividade", "Comemoração/evento",
  "Foi contrariado(a) por uma regra", "Pedido foi negado", "Sem gatilho aparente",
];

const CONSEQUENCIAS = [
  "Conversou/orientou verbalmente", "Redirecionou pra outra atividade",
  "Aguardou se acalmar sozinho(a)", "Chamou outro adulto responsável",
];

const LOCAL_OPCOES: Record<"escola" | "casa", string[]> = {
  escola: ["Sala de aula", "Biblioteca", "Corredor", "Pátio", "Banheiro", "Outro"],
  casa: ["Quarto", "Sala", "Cozinha", "Área externa", "Outro"],
};

const COM_QUEM_OPCOES: Record<"escola" | "casa", string[]> = {
  escola: ["Professora", "Colega", "Você (AT)", "Direção/Coordenação"],
  casa: ["Mãe", "Pai", "Irmão(s)", "Você (AT)", "Outro familiar"],
};

function blocoVazio(): BlocoABC {
  return {
    comportamentos: [], antecedente: [], antecedente_outro: "",
    consequencia: [], consequencia_outro: "", local: "", com_quem: [],
    hora_inicio: "", hora_fim: "",
  };
}

function periodoVazio(): Periodo {
  return { nome: "", hora_inicio: "", tema: "", abc: blocoVazio() };
}

function toggleEm(lista: string[], valor: string) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 transition bg-white";
const labelClass = "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block";

// Definidos FORA do componente da página — se ficassem dentro, o React
// recriaria a função a cada digitação, tirando o foco dos campos de texto
// a cada letra (bug já visto e corrigido na Entrevista Inicial).
function OptGrid({ opcoes, selecionados, onToggle }: { opcoes: string[]; selecionados: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {opcoes.map((op) => {
        const ativo = selecionados.includes(op);
        return (
          <button key={op} type="button" onClick={() => onToggle(op)}
            className={`text-left px-3 py-2.5 rounded-xl border-2 text-xs leading-snug transition ${
              ativo ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}>
            {ativo ? "✓ " : ""}{op}
          </button>
        );
      })}
    </div>
  );
}

function BotaoOpcao({ opcoes, valor, onChange }: { opcoes: string[]; valor: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {opcoes.map((op) => (
        <button key={op} type="button" onClick={() => onChange(op)}
          className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition ${
            valor === op ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"
          }`}>
          {op}
        </button>
      ))}
    </div>
  );
}

// Bloco ABC completo: comportamentos primeiro; o resto (antecedente,
// consequência, local, com quem) só aparece se algum comportamento foi
// marcado — na maioria das aulas não acontece nada interferente.
function BlocoABCForm({ abc, onChange, contexto }: { abc: BlocoABC; onChange: (patch: Partial<BlocoABC>) => void; contexto: "escola" | "casa" }) {
  const temComportamento = abc.comportamentos.length > 0;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-extrabold text-slate-700 mb-2">⚠️ Comportamento interferente?</p>
        <OptGrid opcoes={COMPORTAMENTOS} selecionados={abc.comportamentos}
          onToggle={(v) => onChange({ comportamentos: toggleEm(abc.comportamentos, v) })} />
      </div>

      {temComportamento && (
        <>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-extrabold text-slate-700 mb-2">🧩 O que aconteceu antes</p>
            <OptGrid opcoes={ANTECEDENTES} selecionados={abc.antecedente}
              onToggle={(v) => onChange({ antecedente: toggleEm(abc.antecedente, v) })} />
            <input type="text" value={abc.antecedente_outro} onChange={(e) => onChange({ antecedente_outro: e.target.value })}
              placeholder="Outro (opcional)" className={`${inputClass} mt-2`} />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-extrabold text-slate-700 mb-2">🛟 O que a pessoa fez depois</p>
            <OptGrid opcoes={CONSEQUENCIAS} selecionados={abc.consequencia}
              onToggle={(v) => onChange({ consequencia: toggleEm(abc.consequencia, v) })} />
            <input type="text" value={abc.consequencia_outro} onChange={(e) => onChange({ consequencia_outro: e.target.value })}
              placeholder="Outro (opcional)" className={`${inputClass} mt-2`} />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-extrabold text-slate-700 mb-2">📍 Onde</p>
            <BotaoOpcao opcoes={LOCAL_OPCOES[contexto]} valor={abc.local} onChange={(v) => onChange({ local: v })} />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-extrabold text-slate-700 mb-2">👤 Com quem</p>
            <OptGrid opcoes={COM_QUEM_OPCOES[contexto]} selecionados={abc.com_quem}
              onToggle={(v) => onChange({ com_quem: toggleEm(abc.com_quem, v) })} />
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className={labelClass}>Início do comportamento</label>
              <input type="time" value={abc.hora_inicio} onChange={(e) => onChange({ hora_inicio: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ficou calmo(a) às</label>
              <input type="time" value={abc.hora_fim} onChange={(e) => onChange({ hora_fim: e.target.value })} className={inputClass} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AcompanhamentoEscolaPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [autorId, setAutorId] = useState("");
  const [autorNome, setAutorNome] = useState("");

  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"lista" | "novo">("lista");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [criancaId, setCriancaId] = useState("");
  const [contexto, setContexto] = useState<"escola" | "casa">("escola");
  const [data, setData] = useState(() => hojeLocal());
  const [horaChegada, setHoraChegada] = useState("");
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoAberto, setPeriodoAberto] = useState<number | null>(null);
  const [intervalo, setIntervalo] = useState<BlocoABC & { brincou_com: string }>({ ...blocoVazio(), brincou_com: "" });
  const [lanche, setLanche] = useState<Lanche>({ origem: "", sentado: "", comeu: "", suco: "", obs: "" });
  const [observacoesGerais, setObservacoesGerais] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: a } = await supabase.from("atendentes").select("id, nome").eq("email", user.email).maybeSingle();
      if (a) { setAutorId(a.id); setAutorNome(a.nome || ""); }

      const { data: cr } = await supabase.from("criancas").select("id, nome").eq("ativo", true).order("nome");
      setCriancas(cr || []);
    })();
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setLoading(false); return; }
    const { data: a } = await supabase.from("atendentes").select("id").eq("email", user.email).maybeSingle();
    if (!a) { setLoading(false); return; }

    const { data: reg } = await supabase
      .from("prontuarios")
      .select("id, crianca_id, titulo, conteudo, created_at, feedback_gestao, feedback_por, feedback_em, criancas(nome)")
      .eq("tipo", "acompanhamento_at")
      .eq("autor_id", a.id)
      .order("created_at", { ascending: false });
    setRegistros((reg ?? []) as unknown as Registro[]);
    setLoading(false);
  }

  function abrirNovo() {
    setCriancaId(""); setContexto("escola"); setData(hojeLocal()); setHoraChegada("");
    setPeriodos([]); setPeriodoAberto(null);
    setIntervalo({ ...blocoVazio(), brincou_com: "" });
    setLanche({ origem: "", sentado: "", comeu: "", suco: "", obs: "" });
    setObservacoesGerais(""); setErro(""); setView("novo");
  }

  function adicionarPeriodo() {
    setPeriodos((prev) => [...prev, periodoVazio()]);
    setPeriodoAberto(periodos.length);
  }

  function atualizarPeriodo(idx: number, patch: Partial<Periodo>) {
    setPeriodos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function removerPeriodo(idx: number) {
    setPeriodos((prev) => prev.filter((_, i) => i !== idx));
    setPeriodoAberto(null);
  }

  async function salvar() {
    if (!criancaId) { setErro("Selecione a criança."); return; }
    if (periodos.length === 0) { setErro("Adicione pelo menos um período/aula."); return; }
    setSalvando(true);
    setErro("");

    const nomeCrianca = criancas.find((c) => c.id === criancaId)?.nome || "Criança";
    const conteudoObj: Conteudo = {
      contexto, data, hora_chegada: horaChegada, periodos, intervalo, lanche,
      observacoes_gerais: observacoesGerais,
    };

    const { data: novo, error } = await supabase.from("prontuarios").insert([{
      crianca_id: criancaId,
      autor_id: autorId,
      autor_nome: autorNome || null,
      tipo: "acompanhamento_at",
      titulo: `Acompanhamento ${contexto === "escola" ? "Escolar" : "Domiciliar"} — ${nomeCrianca} — ${new Date(data + "T12:00:00").toLocaleDateString("pt-BR")}`,
      conteudo: JSON.stringify(conteudoObj),
      visivel_familia: false,
      visivel_supervisora: true,
      visivel_gestao: true,
    }]).select().single();

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    await registrarLog(supabase, {
      usuario_email: autorNome, usuario_nome: autorNome, acao: "Registrou acompanhamento",
      tabela: "prontuarios", registro_id: novo?.id,
      descricao: `${nomeCrianca} — ${contexto} — ${periodos.length} período(s)`,
    });

    await supabase.from("notificacoes").insert({
      destinatario_role: "gestao",
      titulo: `📋 Novo acompanhamento ${contexto === "escola" ? "escolar" : "domiciliar"} da AT`,
      mensagem: `${autorNome} registrou o acompanhamento de ${nomeCrianca}`,
      tipo: "relatorio",
      link: "/gestao/relatorios",
      autor_nome: autorNome || null,
    });

    setView("lista");
    carregar();
  }

  function parseConteudo(r: Registro): Conteudo | null {
    try { return JSON.parse(r.conteudo); } catch { return null; }
  }

  if (view === "novo") {
    return (
      <div className="space-y-5 pb-24">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("lista")}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Novo Acompanhamento</h1>
            <p className="text-xs text-slate-400 mt-0.5">Marque o que observou — {autorNome}</p>
          </div>
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className={labelClass}>Onde foi o acompanhamento?</label>
            <div className="grid grid-cols-2 gap-2">
              {(["escola", "casa"] as const).map((op) => (
                <button key={op} type="button" onClick={() => setContexto(op)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition capitalize ${
                    contexto === op ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold" : "border-slate-200 text-slate-600"
                  }`}>
                  {op === "escola" ? "🏫 Escola" : "🏠 Casa"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Criança</label>
              <select value={criancaId} onChange={(e) => setCriancaId(e.target.value)} className={inputClass}>
                <option value="">Selecione...</option>
                {criancas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Horário de chegada</label>
            <input type="time" value={horaChegada} onChange={(e) => setHoraChegada(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            {contexto === "escola" ? "Aulas" : "Momentos observados"}
          </span>
          <span className="text-[11px] text-slate-400">{periodos.length} registrado{periodos.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="space-y-3">
          {periodos.map((p, idx) => {
            const aberto = periodoAberto === idx;
            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div role="button" tabIndex={0} onClick={() => setPeriodoAberto(aberto ? null : idx)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPeriodoAberto(aberto ? null : idx); }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left cursor-pointer">
                  <div className="w-7 h-7 rounded-lg bg-blue-900 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</div>
                  <input type="text" value={p.nome} onClick={(e) => e.stopPropagation()}
                    onChange={(e) => atualizarPeriodo(idx, { nome: e.target.value })}
                    placeholder={contexto === "escola" ? `Aula ${idx + 1} (ex: Português)` : `Momento ${idx + 1} (ex: Tarefa de casa)`}
                    className="flex-1 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400" />
                  <button onClick={(e) => { e.stopPropagation(); removerPeriodo(idx); }}
                    className="text-slate-400 hover:text-red-600 transition shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {aberto ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </div>

                {aberto && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Horário de início</label>
                        <input type="time" value={p.hora_inicio} onChange={(e) => atualizarPeriodo(idx, { hora_inicio: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Tema/atividade</label>
                        <input type="text" value={p.tema} onChange={(e) => atualizarPeriodo(idx, { tema: e.target.value })} placeholder="Ex: Comércio" className={inputClass} />
                      </div>
                    </div>
                    <BlocoABCForm abc={p.abc} contexto={contexto} onChange={(patch) => atualizarPeriodo(idx, { abc: { ...p.abc, ...patch } })} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={adicionarPeriodo}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-bold hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition">
          + Adicionar {contexto === "escola" ? "aula" : "momento"}
        </button>

        {/* Intervalo (só faz sentido na escola) */}
        {contexto === "escola" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
            <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">🍎 Intervalo</p>
            <div>
              <label className={labelClass}>Brincou com colega ou sozinho?</label>
              <BotaoOpcao opcoes={["Com colega", "Sozinho(a)"]} valor={intervalo.brincou_com} onChange={(v) => setIntervalo((prev) => ({ ...prev, brincou_com: v }))} />
            </div>
            <BlocoABCForm abc={intervalo} contexto="escola" onChange={(patch) => setIntervalo((prev) => ({ ...prev, ...patch }))} />
          </div>
        )}

        {/* Lanche */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
          <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">🍽️ Lanche</p>
          <div>
            <label className={labelClass}>Lanche de casa ou da cantina?</label>
            <BotaoOpcao opcoes={["De casa", "Da cantina"]} valor={lanche.origem} onChange={(v) => setLanche((prev) => ({ ...prev, origem: v }))} />
          </div>
          <div>
            <label className={labelClass}>Comeu sentado(a)?</label>
            <BotaoOpcao opcoes={["Sim", "Não"]} valor={lanche.sentado} onChange={(v) => setLanche((prev) => ({ ...prev, sentado: v }))} />
          </div>
          <div>
            <label className={labelClass}>Comeu tudo?</label>
            <BotaoOpcao opcoes={["Tudo", "Parte", "Não comeu"]} valor={lanche.comeu} onChange={(v) => setLanche((prev) => ({ ...prev, comeu: v }))} />
          </div>
          <div>
            <label className={labelClass}>Tomou o suco?</label>
            <BotaoOpcao opcoes={["Tudo", "Parte", "Não tomou", "Não ofereceram"]} valor={lanche.suco} onChange={(v) => setLanche((prev) => ({ ...prev, suco: v }))} />
          </div>
          <input type="text" value={lanche.obs} onChange={(e) => setLanche((prev) => ({ ...prev, obs: e.target.value }))}
            placeholder="Alguma observação sobre o lanche (opcional)" className={inputClass} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-2">
          <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">✍️ Observações gerais</p>
          <p className="text-[11px] text-slate-400">Qualquer coisa que não coube nos campos acima.</p>
          <textarea rows={3} value={observacoesGerais} onChange={(e) => setObservacoesGerais(e.target.value)}
            placeholder="Escreva livremente aqui..." className={`${inputClass} resize-none`} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:left-[var(--sidebar-w,0px)] bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3 z-40">
          <span className="text-xs text-slate-400 mr-auto hidden sm:block">
            {periodos.length} {contexto === "escola" ? "aula(s)" : "momento(s)"}
          </span>
          <button onClick={() => setView("lista")}
            className="flex-1 sm:flex-none h-11 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || !criancaId}
            className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
            {salvando ? "Enviando..." : "Enviar para Simone"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📋 Acompanhamento Escolar/Domiciliar</h1>
          <p className="text-xs text-slate-400 mt-0.5">Registre o que você observou com a criança.</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors self-start">
          <Plus className="h-4 w-4" /> Novo registro
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : registros.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText className="h-10 w-10 mx-auto text-slate-300" />
          <p className="text-sm text-slate-400 mt-2">Nenhum registro ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registros.map((r) => {
            const c = parseConteudo(r);
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{r.criancas?.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      {c?.contexto ? ` · ${c.contexto === "escola" ? "🏫 Escola" : "🏠 Casa"}` : ""}
                    </p>
                  </div>
                  {r.feedback_gestao && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-full whitespace-nowrap">
                      💬 Com feedback
                    </span>
                  )}
                </div>
                {c?.periodos && (
                  <p className="text-xs text-slate-500">
                    {c.periodos.length} {c.contexto === "escola" ? "aula(s)" : "momento(s)"} registrada(s)
                  </p>
                )}
                {c?.observacoes_gerais && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mt-2">{c.observacoes_gerais}</p>
                )}
                {r.feedback_gestao && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-blue-50/50 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Feedback de {r.feedback_por || "Gestão"}</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{r.feedback_gestao}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
