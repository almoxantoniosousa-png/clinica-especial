"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Droplets, Minus } from "lucide-react";

type Material = {
  id: string;
  nome: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number | null;
};

export default function MateriaisApoioPage() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [retirando, setRetirando] = useState<Material | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("materiais_limpeza")
      .select("id, nome, unidade, quantidade_atual, quantidade_minima")
      .eq("ativo", true)
      .order("nome");
    setMateriais(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirRetirada(m: Material) {
    setRetirando(m);
    setQuantidade("1");
    setObservacao("");
  }

  async function confirmarRetirada() {
    if (!retirando) return;
    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      setMsg({ tipo: "erro", texto: "Informe uma quantidade válida." });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("registrar_movimentacao_material", {
      p_material_id: retirando.id,
      p_tipo: "saida",
      p_quantidade: qtd,
      p_observacao: observacao.trim() || null,
    });
    setSalvando(false);
    if (error) {
      setMsg({ tipo: "erro", texto: "Erro ao registrar: " + error.message });
      return;
    }
    setMsg({ tipo: "sucesso", texto: `Retirada de ${retirando.nome} registrada.` });
    setRetirando(null);
    carregar();
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Materiais de Limpeza</h1>
        <p className="text-xs text-slate-400 mt-0.5">Retire o que precisar — o estoque atualiza sozinho</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${msg.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{msg.tipo === "sucesso" ? "✓" : "✕"}</span>
          {msg.texto}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <div className="bg-stone-100 border border-stone-300 rounded-2xl overflow-hidden">
          <div className="divide-y divide-stone-200">
            {materiais.map((m) => {
              const baixo = m.quantidade_minima != null && m.quantidade_atual <= m.quantidade_minima;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Droplets size={13} className="text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-700 truncate">{m.nome}</p>
                      <p className={`text-xs ${baixo ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                        {m.quantidade_atual} {m.unidade}{baixo ? " · estoque baixo" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirRetirada(m)}
                    className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1 flex-shrink-0">
                    <Minus size={11} /> Retirar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {retirando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setRetirando(null); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Retirar {retirando.nome}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tem {retirando.quantidade_atual} {retirando.unidade} no estoque</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Quantidade ({retirando.unidade})</label>
              <input type="number" min="1" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Observação (opcional)</label>
              <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: banheiro de baixo"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRetirando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={confirmarRetirada} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
