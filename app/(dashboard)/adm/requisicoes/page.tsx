"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { ShoppingCart, Link, AlertCircle, ChevronDown, X } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

type Requisicao = {
  id: string;
  solicitante_nome: string;
  solicitante_role: string;
  produto: string;
  quantidade: number;
  descricao: string | null;
  link_compra: string | null;
  urgencia: "normal" | "urgente";
  status: "pendente" | "em_analise" | "comprado" | "entregue" | "recusado";
  obs_adm: string | null;
  created_at: string;
};

const STATUS_CFG = {
  pendente:   { label: "Pendente",    cor: "bg-slate-50 text-slate-600 border-slate-200",       borda: "border-l-slate-400"   },
  em_analise: { label: "Em análise",  cor: "bg-blue-50 text-blue-700 border-blue-200",          borda: "border-l-blue-400"    },
  comprado:   { label: "Comprado",    cor: "bg-violet-50 text-violet-700 border-violet-200",    borda: "border-l-violet-400"  },
  entregue:   { label: "Entregue",    cor: "bg-emerald-50 text-emerald-700 border-emerald-200", borda: "border-l-emerald-400" },
  recusado:   { label: "Recusado",    cor: "bg-red-50 text-red-700 border-red-200",             borda: "border-l-red-400"     },
};

const STATUS_OPCOES = [
  { value: "pendente",   label: "Pendente"   },
  { value: "em_analise", label: "Em análise" },
  { value: "comprado",   label: "Comprado"   },
  { value: "entregue",   label: "Entregue"   },
  { value: "recusado",   label: "Recusado"   },
];

const ABAS = ["Pendentes", "Em análise", "Comprados", "Entregues", "Recusados", "Todos"] as const;
type Aba = typeof ABAS[number];

function fmt(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const ROLE_LABEL: Record<string, string> = {
  supervisora: "Supervisora", gestao: "Gestão", especialista: "Especialista",
  atendente: "Acompanhante", adm: "ADM", admin: "ADM",
};

export default function RequisicoesPaginaAdm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("Pendentes");
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [modalReq, setModalReq] = useState<Requisicao | null>(null);
  const [novoStatus, setNovoStatus] = useState<string>("");
  const [obsAdm, setObsAdm] = useState("");
  const [salvando, setSalvando] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg }); setTimeout(() => setFeedback(null), 3500);
  }

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from("requisicoes_compra").select("*").order("created_at", { ascending: false });
    setRequisicoes(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirModal(r: Requisicao) {
    setModalReq(r); setNovoStatus(r.status); setObsAdm(r.obs_adm || "");
  }

  async function salvarAtualizacao() {
    if (!modalReq) return;
    setSalvando(true);
    const { error } = await supabase.from("requisicoes_compra")
      .update({ status: novoStatus, obs_adm: obsAdm.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", modalReq.id);
    setSalvando(false);
    if (error) { mostrarFeedback("erro", "Erro ao atualizar."); return; }

    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Atualizou requisição de compra",
      tabela: "requisicoes_compra",
      registro_id: modalReq.id,
      descricao: `Produto: ${modalReq.produto} | Solicitante: ${modalReq.solicitante_nome} | Status: ${novoStatus}`,
    });

    mostrarFeedback("sucesso", "Requisição atualizada!");
    setModalReq(null); carregar();
  }

  const filtro: Record<Aba, (r: Requisicao) => boolean> = {
    "Pendentes":   r => r.status === "pendente",
    "Em análise":  r => r.status === "em_analise",
    "Comprados":   r => r.status === "comprado",
    "Entregues":   r => r.status === "entregue",
    "Recusados":   r => r.status === "recusado",
    "Todos":       () => true,
  };

  const lista = requisicoes.filter(filtro[aba]);

  const contagem = {
    pendentes: requisicoes.filter(r => r.status === "pendente").length,
    em_analise: requisicoes.filter(r => r.status === "em_analise").length,
  };

  const inputClass = "w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400 bg-white";

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      <div>
        <h1 className="text-xl font-bold text-slate-900">Requisições de Compra</h1>
        <p className="text-xs text-slate-400 mt-0.5">Pedidos de produtos da equipe</p>
      </div>

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
            <p className="text-2xl font-black text-amber-600">{contagem.pendentes}</p>
            <p className="text-xs text-amber-500 mt-0.5">Pendentes</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-blue-600">{contagem.em_analise}</p>
            <p className="text-xs text-blue-500 mt-0.5">Em análise</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-emerald-600">{requisicoes.filter(r => r.status === "entregue").length}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Entregues</p>
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
            {a === "Pendentes" && contagem.pendentes > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{contagem.pendentes}</span>
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
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
          <ShoppingCart className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhuma requisição nesta categoria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(r => {
            const cfg = STATUS_CFG[r.status];
            return (
              <div key={r.id} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${cfg.borda} shadow-sm p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 text-sm">{r.produto}</p>
                      {r.urgencia === "urgente" && (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                          <AlertCircle className="h-3 w-3" /> Urgente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      👤 {r.solicitante_nome}
                      <span className="text-slate-300 mx-1">·</span>
                      {ROLE_LABEL[r.solicitante_role] || r.solicitante_role}
                      <span className="text-slate-300 mx-1">·</span>
                      Qtd: {r.quantidade}
                      <span className="text-slate-300 mx-1">·</span>
                      {fmt(r.created_at)}
                    </p>
                    {r.descricao && <p className="text-xs text-slate-500 italic">"{r.descricao}"</p>}
                    {r.link_compra && (
                      <a href={r.link_compra} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Link className="h-3 w-3" /> Ver produto
                      </a>
                    )}
                    {r.obs_adm && (
                      <div className="mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <p className="text-xs font-bold text-slate-500">Sua resposta:</p>
                        <p className="text-xs text-slate-700 mt-0.5">{r.obs_adm}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${cfg.cor}`}>{cfg.label}</span>
                    <button onClick={() => abrirModal(r)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition">
                      Atualizar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ATUALIZAR */}
      {modalReq && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Atualizar requisição</h2>
              <button onClick={() => setModalReq(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
              <p className="text-sm font-bold text-slate-800">{modalReq.produto} <span className="font-normal text-slate-500">× {modalReq.quantidade}</span></p>
              <p className="text-xs text-slate-500">Solicitado por {modalReq.solicitante_nome} em {fmt(modalReq.created_at)}</p>
              {modalReq.descricao && <p className="text-xs text-slate-500 italic">"{modalReq.descricao}"</p>}
              {modalReq.link_compra && (
                <a href={modalReq.link_compra} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline pt-0.5">
                  <Link className="h-3 w-3" /> Ver produto
                </a>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</label>
              <div className="relative">
                <select value={novoStatus} onChange={e => setNovoStatus(e.target.value)}
                  className={inputClass + " appearance-none pr-10"}>
                  {STATUS_OPCOES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Observação para o solicitante (opcional)
              </label>
              <textarea value={obsAdm} onChange={e => setObsAdm(e.target.value)}
                placeholder="Ex: Produto comprado, chega quinta-feira. / Não aprovado pois já temos em estoque."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400 bg-white resize-none" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalReq(null)}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvarAtualizacao} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
