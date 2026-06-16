"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { Package, ClipboardList, Trophy, ArrowDownToLine, Undo2, Plus, Trash2, X } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

type Emprestimo = {
  id: string;
  brinquedo_nome: string;
  solicitante_nome: string;
  solicitante_role: string;
  crianca_nome: string;
  status: "solicitado" | "retirado" | "devolvido";
  obs: string | null;
  data_solicitacao: string;
  data_retirada: string | null;
  data_devolucao: string | null;
};

type Brinquedo = { id: string; nome: string; ativo: boolean };

const STATUS_CFG = {
  solicitado: { label: "Solicitado",  cor: "bg-amber-50 text-amber-700 border-amber-200",   borda: "border-l-amber-400" },
  retirado:   { label: "Retirado",    cor: "bg-blue-50 text-blue-700 border-blue-200",       borda: "border-l-blue-400"  },
  devolvido:  { label: "Devolvido",   cor: "bg-emerald-50 text-emerald-700 border-emerald-200", borda: "border-l-emerald-400" },
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ABAS = ["Solicitações", "Em Posse", "Histórico", "Catálogo", "Ranking"] as const;
type Aba = typeof ABAS[number];

export default function BrinquedosAdmPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("Solicitações");
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [brinquedos, setBrinquedos] = useState<Brinquedo[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [novoBrinquedo, setNovoBrinquedo] = useState("");
  const [salvandoCatalogo, setSalvandoCatalogo] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregar() {
    setLoading(true);
    const [{ data: emp }, { data: bri }] = await Promise.all([
      supabase.from("brinquedos_emprestimos").select("*").order("data_solicitacao", { ascending: false }),
      supabase.from("brinquedos").select("*").order("nome"),
    ]);
    setEmprestimos(emp || []);
    setBrinquedos(bri || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function registrarRetirada(id: string) {
    const { error } = await supabase
      .from("brinquedos_emprestimos")
      .update({ status: "retirado", data_retirada: new Date().toISOString() })
      .eq("id", id);
    if (error) { mostrarFeedback("erro", "Erro ao registrar retirada."); return; }
    const emp = emprestimos.find(e => e.id === id);
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Registrou retirada de brinquedo",
      tabela: "brinquedos_emprestimos",
      registro_id: id,
      descricao: `Brinquedo: ${emp?.brinquedo_nome || id} | Solicitante: ${emp?.solicitante_nome || ""} | Criança: ${emp?.crianca_nome || ""}`,
    });
    mostrarFeedback("sucesso", "Retirada registrada!");
    carregar();
  }

  async function registrarDevolucao(id: string) {
    const { error } = await supabase
      .from("brinquedos_emprestimos")
      .update({ status: "devolvido", data_devolucao: new Date().toISOString() })
      .eq("id", id);
    if (error) { mostrarFeedback("erro", "Erro ao registrar devolução."); return; }
    const emp = emprestimos.find(e => e.id === id);
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Registrou devolução de brinquedo",
      tabela: "brinquedos_emprestimos",
      registro_id: id,
      descricao: `Brinquedo: ${emp?.brinquedo_nome || id} | Solicitante: ${emp?.solicitante_nome || ""} | Criança: ${emp?.crianca_nome || ""}`,
    });
    mostrarFeedback("sucesso", "Devolução registrada!");
    carregar();
  }

  async function adicionarAoCatalogo() {
    const nome = novoBrinquedo.trim();
    if (!nome) return;
    setSalvandoCatalogo(true);
    const { data: novoCat, error } = await supabase.from("brinquedos").insert({ nome }).select().single();
    setSalvandoCatalogo(false);
    if (error) { mostrarFeedback("erro", "Erro ou brinquedo já existe no catálogo."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Adicionou brinquedo ao catálogo",
      tabela: "brinquedos",
      registro_id: novoCat?.id,
      descricao: `Brinquedo: ${nome}`,
    });
    setNovoBrinquedo("");
    mostrarFeedback("sucesso", `"${nome}" adicionado ao catálogo.`);
    carregar();
  }

  async function excluirBrinquedo(id: string, nome: string) {
    const { error } = await supabase.from("brinquedos").delete().eq("id", id);
    if (error) { mostrarFeedback("erro", "Não foi possível excluir."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Removeu brinquedo do catálogo",
      tabela: "brinquedos",
      registro_id: id,
      descricao: `Brinquedo: ${nome}`,
    });
    mostrarFeedback("sucesso", `"${nome}" removido do catálogo.`);
    carregar();
  }

  const solicitados = emprestimos.filter(e => e.status === "solicitado");
  const emPosse     = emprestimos.filter(e => e.status === "retirado");
  const historico   = emprestimos.filter(e => e.status === "devolvido");

  // Ranking
  const rankingBrinquedos = Object.entries(
    emprestimos.reduce<Record<string, number>>((acc, e) => {
      acc[e.brinquedo_nome] = (acc[e.brinquedo_nome] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const rankingColaboradoras = Object.entries(
    emprestimos.reduce<Record<string, number>>((acc, e) => {
      acc[e.solicitante_nome] = (acc[e.solicitante_nome] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const rankingCriancas = Object.entries(
    emprestimos.reduce<Record<string, number>>((acc, e) => {
      acc[e.crianca_nome] = (acc[e.crianca_nome] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const inputClass = "w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400 bg-white";

  function CardEmprestimo({ e, acoes }: { e: Emprestimo; acoes?: React.ReactNode }) {
    const cfg = STATUS_CFG[e.status];
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${cfg.borda} shadow-sm p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">{e.brinquedo_nome}</p>
            <p className="text-xs text-slate-500">
              👤 {e.solicitante_nome} <span className="text-slate-300 mx-1">·</span>
              👶 {e.crianca_nome} <span className="text-slate-300 mx-1">·</span>
              <span className="capitalize text-slate-400">{e.solicitante_role}</span>
            </p>
            <p className="text-xs text-slate-400">Solicitado: {fmt(e.data_solicitacao)}</p>
            {e.data_retirada && <p className="text-xs text-blue-500">Retirado: {fmt(e.data_retirada)}</p>}
            {e.data_devolucao && <p className="text-xs text-emerald-500">Devolvido: {fmt(e.data_devolucao)}</p>}
            {e.obs && <p className="text-xs text-slate-500 italic mt-1">"{e.obs}"</p>}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${cfg.cor}`}>{cfg.label}</span>
            {acoes}
          </div>
        </div>
      </div>
    );
  }

  function RankingCard({ titulo, emoji, dados }: { titulo: string; emoji: string; dados: [string, number][] }) {
    if (dados.length === 0) return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="font-bold text-slate-700 mb-3">{emoji} {titulo}</p>
        <p className="text-xs text-slate-400">Nenhum registro ainda.</p>
      </div>
    );
    const medals = ["🥇", "🥈", "🥉", "4º", "5º"];
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="font-bold text-slate-700 mb-3">{emoji} {titulo}</p>
        <div className="space-y-2">
          {dados.map(([nome, count], i) => (
            <div key={nome} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm w-6 flex-shrink-0">{medals[i]}</span>
                <span className="text-sm text-slate-700 truncate">{nome}</span>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-0.5 flex-shrink-0">
                {count}×
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Brinquedos</h1>
        <p className="text-xs text-slate-400 mt-0.5">Empréstimo e controle de brinquedos</p>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
          feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {feedback.tipo === "sucesso" ? "✓" : "✕"} {feedback.msg}
        </div>
      )}

      {/* RESUMO */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-amber-600">{solicitados.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">Solicitações</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-blue-600">{emPosse.length}</p>
            <p className="text-xs text-blue-500 mt-0.5">Em Posse</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-emerald-600">{historico.length}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Devolvidos</p>
          </div>
        </div>
      )}

      {/* ABAS */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {ABAS.map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              aba === a ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {a}
            {a === "Solicitações" && solicitados.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{solicitados.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : (
        <>
          {/* ABA: SOLICITAÇÕES */}
          {aba === "Solicitações" && (
            <div className="space-y-3">
              {solicitados.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <ClipboardList className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhuma solicitação pendente.</p>
                </div>
              ) : solicitados.map(e => (
                <CardEmprestimo key={e.id} e={e} acoes={
                  <button onClick={() => registrarRetirada(e.id)}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition">
                    <ArrowDownToLine className="h-3.5 w-3.5" /> Retirada
                  </button>
                } />
              ))}
            </div>
          )}

          {/* ABA: EM POSSE */}
          {aba === "Em Posse" && (
            <div className="space-y-3">
              {emPosse.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <Package className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhum brinquedo fora do estoque.</p>
                </div>
              ) : emPosse.map(e => (
                <CardEmprestimo key={e.id} e={e} acoes={
                  <button onClick={() => registrarDevolucao(e.id)}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition">
                    <Undo2 className="h-3.5 w-3.5" /> Devolução
                  </button>
                } />
              ))}
            </div>
          )}

          {/* ABA: HISTÓRICO */}
          {aba === "Histórico" && (
            <div className="space-y-3">
              {historico.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <p className="text-sm text-slate-400">Nenhum registro de devolução ainda.</p>
                </div>
              ) : historico.map(e => <CardEmprestimo key={e.id} e={e} />)}
            </div>
          )}

          {/* ABA: CATÁLOGO */}
          {aba === "Catálogo" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adicionar brinquedo</p>
                <div className="flex gap-2">
                  <input value={novoBrinquedo} onChange={e => setNovoBrinquedo(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && adicionarAoCatalogo()}
                    placeholder="Nome do brinquedo..." className={inputClass} />
                  <button onClick={adicionarAoCatalogo} disabled={!novoBrinquedo.trim() || salvandoCatalogo}
                    className="h-11 px-4 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2 shadow-lg flex-shrink-0">
                    <Plus className="h-4 w-4" /> Adicionar
                  </button>
                </div>
              </div>

              {brinquedos.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <Package className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Catálogo vazio. As solicitações criam o catálogo automaticamente.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {brinquedos.map(b => (
                    <div key={b.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-800">{b.nome}</span>
                      </div>
                      <button onClick={() => excluirBrinquedo(b.id, b.nome)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA: RANKING */}
          {aba === "Ranking" && (
            <div className="space-y-4">
              {emprestimos.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <Trophy className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Sem dados suficientes para o ranking ainda.</p>
                </div>
              ) : (
                <>
                  <RankingCard titulo="Brinquedo mais solicitado" emoji="🧸" dados={rankingBrinquedos} />
                  <RankingCard titulo="Colaboradora que mais solicita" emoji="👤" dados={rankingColaboradoras} />
                  <RankingCard titulo="Criança que mais usa" emoji="👶" dados={rankingCriancas} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
