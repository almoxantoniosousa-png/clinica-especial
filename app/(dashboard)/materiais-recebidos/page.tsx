"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { PackageCheck, Plus, ShieldCheck } from "lucide-react";

const DECLARACAO =
  "Declaro que recebi o material descrito acima em bom estado, sem defeitos ou quebras, e me comprometo a zelar pelo seu uso adequado. Em caso de perda, quebra ou mau uso, me responsabilizo pela reposição ou substituição do item.";

type Registro = {
  id: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_role: string | null;
  material: string;
  quantidade: number;
  observacao: string | null;
  texto_declaracao: string;
  declarado_em: string;
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MateriaisRecebidosPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [eu, setEu] = useState<{ id: string; nome: string; role: string } | null>(null);
  const [podeRegistrar, setPodeRegistrar] = useState(false);
  const [podeVerTudo, setPodeVerTudo] = useState(false);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [material, setMaterial] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [aceitou, setAceitou] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function carregar() {
    setCarregando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCarregando(false); return; }

    const { data: atendente } = await supabase.from("atendentes").select("id, nome, role").eq("email", user.email).maybeSingle();
    const { data: usuario } = atendente ? { data: null } : await supabase.from("usuarios").select("nome, role").eq("id", user.id).maybeSingle();
    const meuId = atendente?.id || user.id;
    const meuNome = atendente?.nome || usuario?.nome || user.email || "";
    const meuRole = atendente?.role || usuario?.role || "";
    setEu({ id: meuId, nome: meuNome, role: meuRole });

    // Excecao nomeada: Vera (supervisora) tambem registra, alem de qualquer AT.
    const souVera = meuId === "f2f0fba1-06e8-4076-8533-0b20acc28e20";
    setPodeRegistrar(meuRole === "atendente" || souVera);
    const vejoTudo = ["adm", "admin", "gestao", "supervisora"].includes(meuRole);
    setPodeVerTudo(vejoTudo);

    const query = supabase.from("materiais_recebidos").select("*").order("declarado_em", { ascending: false });
    const { data } = vejoTudo ? await query : await query.eq("solicitante_id", meuId);
    setRegistros(data || []);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirModal() {
    setMaterial(""); setQuantidade("1"); setObservacao(""); setAceitou(false);
    setModalAberto(true);
  }

  async function salvar() {
    if (!eu || !material.trim()) { mostrarFeedback("erro", "Informe o material recebido."); return; }
    if (!aceitou) { mostrarFeedback("erro", "É preciso aceitar a declaração de responsabilidade."); return; }
    setSalvando(true);
    const { error } = await supabase.from("materiais_recebidos").insert({
      solicitante_id: eu.id,
      solicitante_nome: eu.nome,
      solicitante_role: eu.role,
      material: material.trim(),
      quantidade: parseInt(quantidade) || 1,
      observacao: observacao.trim() || null,
      texto_declaracao: DECLARACAO,
    });
    setSalvando(false);
    if (error) { mostrarFeedback("erro", "Erro ao registrar: " + error.message); return; }

    await registrarLog(supabase, {
      usuario_email: eu.nome, usuario_nome: eu.nome,
      acao: "Registrou recebimento de material",
      tabela: "materiais_recebidos",
      descricao: `${material.trim()} — qtd ${quantidade}`,
    });

    mostrarFeedback("sucesso", "Recebimento registrado!");
    setModalAberto(false);
    carregar();
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-16 text-sm text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <PackageCheck className="text-blue-700" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Materiais Recebidos</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {podeVerTudo ? "Histórico de recebimento de materiais, com declaração de responsabilidade" : "Seu histórico de materiais recebidos da clínica"}
            </p>
          </div>
        </div>
        {podeRegistrar && (
          <button onClick={abrirModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
            <Plus size={16} /> Registrar recebimento
          </button>
        )}
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {feedback.msg}
        </div>
      )}

      {registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <PackageCheck className="text-slate-300 mb-2" size={40} />
          <p className="text-sm text-slate-400">Nenhum material registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registros.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="font-semibold text-slate-800 text-sm">{r.material} <span className="text-slate-400 font-normal">· qtd {r.quantidade}</span></p>
                <span className="text-xs text-slate-400">{fmt(r.declarado_em)}</span>
              </div>
              {podeVerTudo && <p className="text-xs text-slate-500">Recebido por {r.solicitante_nome}</p>}
              {r.observacao && <p className="text-sm text-slate-600">{r.observacao}</p>}
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                <ShieldCheck size={13} /> Declaração de responsabilidade aceita no recebimento
              </p>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-8 sm:pt-24 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full sm:max-w-md bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-blue-900 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">Registrar recebimento de material</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Material *</label>
                <input value={material} onChange={e => setMaterial(e.target.value)}
                  placeholder="Ex: Jogo de encaixe, massinha, tesoura sem ponta..."
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quantidade</label>
                <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observação (opcional)</label>
                <textarea rows={2} value={observacao} onChange={e => setObservacao(e.target.value)}
                  placeholder="Alguma condição específica do material?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <label className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
                <input type="checkbox" checked={aceitou} onChange={e => setAceitou(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-blue-900 flex-shrink-0"/>
                <span className="text-xs text-amber-900 leading-relaxed">{DECLARACAO}</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-white">
              <button onClick={salvar} disabled={salvando || !aceitou}
                className="w-full h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Confirmar recebimento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
