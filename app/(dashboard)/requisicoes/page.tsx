"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabaseBrowserClient";
import { ShoppingCart, Plus, Link, ChevronDown, AlertCircle } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

type Requisicao = {
  id: string;
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
  pendente:    { label: "Pendente",    cor: "bg-slate-50 text-slate-600 border-slate-200",      borda: "border-l-slate-400"   },
  em_analise:  { label: "Em análise",  cor: "bg-blue-50 text-blue-700 border-blue-200",         borda: "border-l-blue-400"    },
  comprado:    { label: "Comprado",    cor: "bg-violet-50 text-violet-700 border-violet-200",   borda: "border-l-violet-400"  },
  entregue:    { label: "Entregue",    cor: "bg-emerald-50 text-emerald-700 border-emerald-200",borda: "border-l-emerald-400" },
  recusado:    { label: "Recusado",    cor: "bg-red-50 text-red-700 border-red-200",            borda: "border-l-red-400"     },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const inputClass = "w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400 bg-white";
const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5";

export default function RequisicoesPagina() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [eu, setEu] = useState<{ id: string; nome: string; role: string; email: string } | null>(null);
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [produto, setProduto] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [descricao, setDescricao] = useState("");
  const [linkCompra, setLinkCompra] = useState("");
  const [urgencia, setUrgencia] = useState<"normal" | "urgente">("normal");

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  function limparForm() {
    setProduto(""); setQuantidade("1"); setDescricao(""); setLinkCompra(""); setUrgencia("normal");
  }

  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let nome = "", role = "";
    const { data: uData } = await supabase.from("usuarios").select("nome, role").eq("id", user.id).maybeSingle();
    if (uData) { nome = uData.nome || ""; role = uData.role || ""; }
    else {
      const { data: pData } = await supabase.from("perfis").select("nome, role").eq("id", user.id).maybeSingle();
      if (pData) { nome = (pData as any).nome || ""; role = (pData as any).role || ""; }
    }
    setEu({ id: user.id, nome, role, email: user.email || "" });

    const { data } = await supabase.from("requisicoes_compra").select("*")
      .eq("solicitante_id", user.id).order("created_at", { ascending: false });
    setRequisicoes(data || []);
    setLoading(false);
  }

  useEffect(() => { inicializar(); }, []);

  async function enviar() {
    if (!eu || !produto.trim()) { mostrarFeedback("erro", "Informe o nome do produto."); return; }
    setSalvando(true);
    const { error } = await supabase.from("requisicoes_compra").insert({
      solicitante_id:   eu.id,
      solicitante_nome: eu.nome,
      solicitante_role: eu.role,
      produto:          produto.trim(),
      quantidade:       parseInt(quantidade) || 1,
      descricao:        descricao.trim() || null,
      link_compra:      linkCompra.trim() || null,
      urgencia,
    });
    setSalvando(false);
    if (error) { mostrarFeedback("erro", "Erro ao enviar requisição."); return; }

    await registrarLog(supabase, {
      usuario_email: eu.email,
      usuario_nome: eu.nome,
      acao: "Criou requisição de compra",
      tabela: "requisicoes_compra",
      descricao: `Produto: ${produto.trim()} | Qtd: ${quantidade} | Urgência: ${urgencia}`,
    });

    mostrarFeedback("sucesso", `Requisição de "${produto.trim()}" enviada ao ADM!`);
    limparForm(); setModalAberto(false); inicializar();
  }

  const pendentes  = requisicoes.filter(r => r.status === "pendente").length;
  const emAberto   = requisicoes.filter(r => ["pendente","em_analise"].includes(r.status)).length;

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Requisições de Compra</h1>
          <p className="text-xs text-slate-400 mt-0.5">Solicite produtos ao ADM</p>
        </div>
        <button onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition shadow-lg flex-shrink-0">
          <Plus className="h-4 w-4" /> Nova requisição
        </button>
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
      {!loading && requisicoes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-800">{requisicoes.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-amber-600">{emAberto}</p>
            <p className="text-xs text-amber-500 mt-0.5">Em aberto</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-emerald-600">{requisicoes.filter(r => r.status === "entregue").length}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Entregues</p>
          </div>
        </div>
      )}

      {/* LISTA */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : requisicoes.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
          <ShoppingCart className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhuma requisição enviada ainda.</p>
          <button onClick={() => setModalAberto(true)} className="text-sm text-blue-600 font-semibold hover:underline">
            Fazer primeira requisição
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {requisicoes.map(r => {
            const cfg = STATUS_CFG[r.status];
            return (
              <div key={r.id} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${cfg.borda} shadow-sm p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 text-sm">{r.produto}</p>
                      {r.urgencia === "urgente" && (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                          <AlertCircle className="h-3 w-3" /> Urgente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Qtd: {r.quantidade} · {fmt(r.created_at)}</p>
                    {r.descricao && <p className="text-xs text-slate-500 italic">"{r.descricao}"</p>}
                    {r.link_compra && (
                      <a href={r.link_compra} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Link className="h-3 w-3" /> Ver produto
                      </a>
                    )}
                    {r.obs_adm && (
                      <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <p className="text-xs font-bold text-slate-500">Resposta do ADM:</p>
                        <p className="text-xs text-slate-700 mt-0.5">{r.obs_adm}</p>
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${cfg.cor}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Nova requisição</h2>
              <button onClick={() => { setModalAberto(false); limparForm(); }} className="p-1.5 hover:bg-slate-100 rounded-lg transition">✕</button>
            </div>

            <div>
              <label className={labelClass}><ShoppingCart className="h-3.5 w-3.5" /> Produto *</label>
              <input value={produto} onChange={e => setProduto(e.target.value)}
                placeholder="Ex: Massa de modelar, Tesoura sem ponta..."
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Quantidade</label>
              <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Descrição / Para que serve (opcional)</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Para atividade de coordenação motora fina com crianças de 5 anos..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400 bg-white resize-none" />
            </div>

            <div>
              <label className={labelClass}><Link className="h-3.5 w-3.5" /> Link do produto (opcional)</label>
              <input value={linkCompra} onChange={e => setLinkCompra(e.target.value)}
                placeholder="https://..."
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Urgência</label>
              <div className="relative">
                <select value={urgencia} onChange={e => setUrgencia(e.target.value as "normal" | "urgente")}
                  className={inputClass + " appearance-none pr-10"}>
                  <option value="normal">Normal</option>
                  <option value="urgente">🔴 Urgente</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setModalAberto(false); limparForm(); }}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={enviar} disabled={salvando || !produto.trim()}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                {salvando ? "Enviando..." : "Enviar ao ADM"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
