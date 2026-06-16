"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabaseBrowserClient";
import { Package, Plus, ChevronDown } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

type Crianca = { id: string; nome: string };
type Brinquedo = { id: string; nome: string };
type Emprestimo = {
  id: string;
  brinquedo_nome: string;
  crianca_nome: string;
  status: "solicitado" | "retirado" | "devolvido";
  obs: string | null;
  data_solicitacao: string;
  data_retirada: string | null;
  data_devolucao: string | null;
};

const STATUS_CFG = {
  solicitado: { label: "Solicitado", cor: "bg-amber-50 text-amber-700 border-amber-200",       borda: "border-l-amber-400"   },
  retirado:   { label: "Retirado",   cor: "bg-blue-50 text-blue-700 border-blue-200",          borda: "border-l-blue-400"    },
  devolvido:  { label: "Devolvido",  cor: "bg-emerald-50 text-emerald-700 border-emerald-200", borda: "border-l-emerald-400" },
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const inputClass = "w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400 bg-white";
const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5";

export default function BrinquedosPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [eu, setEu] = useState<{ id: string; nome: string; role: string; email: string } | null>(null);
  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [catalogo, setCatalogo] = useState<Brinquedo[]>([]);
  const [meusPedidos, setMeusPedidos] = useState<Emprestimo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const [criancaSel, setCriancaSel] = useState("");
  const [brinquedoSel, setBrinquedoSel] = useState("");
  const [brinquedoTexto, setBrinquedoTexto] = useState("");
  const [obs, setObs] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function inicializar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let perfilNome = "";
    let perfilRole = "";
    const { data: uData } = await supabase.from("usuarios").select("nome, role").eq("id", user.id).maybeSingle();
    if (uData) {
      perfilNome = uData.nome || "";
      perfilRole = uData.role || "";
    } else {
      const { data: pData } = await supabase.from("perfis").select("nome, role").eq("id", user.id).maybeSingle();
      if (pData) { perfilNome = (pData as any).nome || ""; perfilRole = (pData as any).role || ""; }
    }
    setEu({ id: user.id, nome: perfilNome, role: perfilRole, email: user.email || "" });

    const [{ data: cri }, { data: cat }, { data: pedidos }] = await Promise.all([
      supabase.from("criancas").select("id, nome").order("nome"),
      supabase.from("brinquedos").select("id, nome").order("nome"),
      supabase.from("brinquedos_emprestimos").select("*")
        .eq("solicitante_id", user.id).order("data_solicitacao", { ascending: false }),
    ]);

    setCriancas(cri || []);
    setCatalogo(cat || []);
    setMeusPedidos(pedidos || []);
    setLoading(false);
  }

  useEffect(() => { inicializar(); }, []);

  const sugestoesFiltradas = catalogo.filter(b =>
    brinquedoTexto.length > 0 && b.nome.toLowerCase().includes(brinquedoTexto.toLowerCase())
  );

  function selecionarBrinquedo(b: Brinquedo) {
    setBrinquedoSel(b.id);
    setBrinquedoTexto(b.nome);
    setMostrarSugestoes(false);
  }

  async function enviarSolicitacao() {
    if (!eu || !criancaSel || !brinquedoTexto.trim()) {
      mostrarFeedback("erro", "Preencha a criança e o brinquedo.");
      return;
    }

    setSalvando(true);
    const nomeBrinquedo = brinquedoTexto.trim();
    let brinquedoId = brinquedoSel || null;

    // Se é um nome novo, adiciona ao catálogo automaticamente
    if (!brinquedoId) {
      const existente = catalogo.find(b => b.nome.toLowerCase() === nomeBrinquedo.toLowerCase());
      if (existente) {
        brinquedoId = existente.id;
      } else {
        const { data: novo } = await supabase.from("brinquedos").insert({ nome: nomeBrinquedo }).select().single();
        if (novo) brinquedoId = novo.id;
      }
    }

    const crianca = criancas.find(c => c.id === criancaSel);

    const { error } = await supabase.from("brinquedos_emprestimos").insert({
      brinquedo_id:     brinquedoId,
      brinquedo_nome:   nomeBrinquedo,
      solicitante_id:   eu.id,
      solicitante_nome: eu.nome,
      solicitante_role: eu.role,
      crianca_id:       criancaSel,
      crianca_nome:     crianca?.nome || "",
      obs:              obs.trim() || null,
    });

    setSalvando(false);
    if (error) { mostrarFeedback("erro", "Erro ao enviar solicitação."); return; }

    await registrarLog(supabase, {
      usuario_email: eu.email,
      usuario_nome: eu.nome,
      acao: "Solicitou brinquedo",
      tabela: "brinquedos_emprestimos",
      descricao: `Brinquedo: ${nomeBrinquedo} | Criança: ${criancas.find(c => c.id === criancaSel)?.nome || criancaSel}`,
    });

    mostrarFeedback("sucesso", `Solicitação de "${nomeBrinquedo}" enviada!`);
    setCriancaSel(""); setBrinquedoSel(""); setBrinquedoTexto(""); setObs(""); setModalAberto(false);
    inicializar();
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Brinquedos</h1>
          <p className="text-xs text-slate-400 mt-0.5">Solicite brinquedos para usar com as crianças</p>
        </div>
        <button onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition shadow-lg flex-shrink-0">
          <Plus className="h-4 w-4" /> Nova solicitação
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
      {!loading && meusPedidos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(["solicitado", "retirado", "devolvido"] as const).map(s => {
            const cfg = STATUS_CFG[s];
            const count = meusPedidos.filter(e => e.status === s).length;
            return (
              <div key={s} className={`${cfg.cor.split(" ")[0]} border ${cfg.cor.split(" ")[2]} rounded-2xl p-4 text-center shadow-sm`}>
                <p className={`text-2xl font-black ${cfg.cor.split(" ")[1]}`}>{count}</p>
                <p className={`text-xs mt-0.5 ${cfg.cor.split(" ")[1]}`}>{cfg.label}</p>
              </div>
            );
          })}
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
      ) : meusPedidos.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
          <Package className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Você ainda não fez nenhuma solicitação.</p>
          <button onClick={() => setModalAberto(true)}
            className="text-sm text-blue-600 font-semibold hover:underline">
            Fazer primeira solicitação
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meusPedidos.map(e => {
            const cfg = STATUS_CFG[e.status];
            return (
              <div key={e.id} className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${cfg.borda} shadow-sm p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">{e.brinquedo_nome}</p>
                    <p className="text-xs text-slate-500">👶 {e.crianca_nome}</p>
                    <p className="text-xs text-slate-400">Solicitado: {fmt(e.data_solicitacao)}</p>
                    {e.data_retirada  && <p className="text-xs text-blue-500">Retirado: {fmt(e.data_retirada)}</p>}
                    {e.data_devolucao && <p className="text-xs text-emerald-500">Devolvido: {fmt(e.data_devolucao)}</p>}
                    {e.obs && <p className="text-xs text-slate-500 italic mt-1">"{e.obs}"</p>}
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${cfg.cor}`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NOVA SOLICITAÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Nova solicitação</h2>
              <button onClick={() => setModalAberto(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">✕</button>
            </div>

            {/* Criança */}
            <div>
              <label className={labelClass}><span>👶</span> Criança *</label>
              <div className="relative">
                <select value={criancaSel} onChange={e => setCriancaSel(e.target.value)}
                  className={inputClass + " appearance-none pr-10"}>
                  <option value="">Selecione a criança...</option>
                  {criancas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Brinquedo */}
            <div className="relative">
              <label className={labelClass}><Package className="h-3.5 w-3.5" /> Brinquedo *</label>
              <input
                value={brinquedoTexto}
                onChange={e => { setBrinquedoTexto(e.target.value); setBrinquedoSel(""); setMostrarSugestoes(true); }}
                onFocus={() => setMostrarSugestoes(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
                placeholder="Digite ou escolha do catálogo..."
                className={inputClass}
              />
              {mostrarSugestoes && sugestoesFiltradas.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {sugestoesFiltradas.map(b => (
                    <button key={b.id} onMouseDown={() => selecionarBrinquedo(b)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition">
                      {b.nome}
                    </button>
                  ))}
                </div>
              )}
              {catalogo.length > 0 && !brinquedoTexto && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Catálogo: {catalogo.slice(0, 5).map(b => b.nome).join(", ")}{catalogo.length > 5 ? "..." : ""}
                </p>
              )}
            </div>

            {/* Observação */}
            <div>
              <label className={labelClass}>Observação (opcional)</label>
              <input value={obs} onChange={e => setObs(e.target.value)}
                placeholder="Ex: para atividade de coordenação motora"
                className={inputClass} />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={enviarSolicitacao} disabled={salvando || !criancaSel || !brinquedoTexto.trim()}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                {salvando ? "Enviando..." : "Enviar solicitação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
