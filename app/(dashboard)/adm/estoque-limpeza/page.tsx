"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Droplets, Plus, History, PackagePlus } from "lucide-react";

type Material = {
  id: string;
  nome: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number | null;
};

type Movimentacao = {
  id: string;
  material_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  responsavel_nome: string;
  observacao: string | null;
  created_at: string;
};

export default function EstoqueLimpezaPage() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [lancando, setLancando] = useState<Material | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [novoProdutoAberto, setNovoProdutoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("un");
  const [novaQtdMinima, setNovaQtdMinima] = useState("");
  const [criandoProduto, setCriandoProduto] = useState(false);

  async function carregar() {
    setLoading(true);
    const [{ data: mats }, { data: movs }] = await Promise.all([
      supabase.from("materiais_limpeza").select("id, nome, unidade, quantidade_atual, quantidade_minima").eq("ativo", true).order("nome"),
      supabase.from("materiais_limpeza_movimentacoes").select("id, material_id, tipo, quantidade, responsavel_nome, observacao, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setMateriais(mats || []);
    setMovimentacoes(movs || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirEntrada(m: Material) {
    setLancando(m);
    setQuantidade("1");
    setObservacao("");
  }

  async function confirmarEntrada() {
    if (!lancando) return;
    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      setMsg({ tipo: "erro", texto: "Informe uma quantidade válida." });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("registrar_movimentacao_material", {
      p_material_id: lancando.id,
      p_tipo: "entrada",
      p_quantidade: qtd,
      p_observacao: observacao.trim() || null,
    });
    setSalvando(false);
    if (error) {
      setMsg({ tipo: "erro", texto: "Erro ao registrar: " + error.message });
      return;
    }
    setMsg({ tipo: "sucesso", texto: `Entrada de ${lancando.nome} registrada.` });
    setLancando(null);
    carregar();
    setTimeout(() => setMsg(null), 4000);
  }

  function nomeDoMaterial(id: string) {
    return materiais.find((m) => m.id === id)?.nome || "—";
  }

  function abrirNovoProduto() {
    setNovoNome("");
    setNovaUnidade("un");
    setNovaQtdMinima("");
    setNovoProdutoAberto(true);
  }

  async function confirmarNovoProduto() {
    if (!novoNome.trim()) {
      setMsg({ tipo: "erro", texto: "Informe o nome do produto." });
      return;
    }
    setCriandoProduto(true);
    const { error } = await supabase.from("materiais_limpeza").insert({
      nome: novoNome.trim(),
      unidade: novaUnidade.trim() || "un",
      quantidade_minima: novaQtdMinima ? Number(novaQtdMinima) : null,
    });
    setCriandoProduto(false);
    if (error) {
      setMsg({ tipo: "erro", texto: "Erro ao cadastrar: " + error.message });
      return;
    }
    setMsg({ tipo: "sucesso", texto: `${novoNome.trim()} cadastrado no estoque.` });
    setNovoProdutoAberto(false);
    carregar();
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Estoque de Materiais de Limpeza</h1>
          <p className="text-xs text-slate-400 mt-0.5">Acompanhe o estoque e registre entradas de compra</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={abrirNovoProduto}
            className="h-9 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold transition flex items-center gap-1.5">
            <PackagePlus size={14} /> Novo produto
          </button>
          <button onClick={() => setHistoricoAberto((v) => !v)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5">
            <History size={14} /> {historicoAberto ? "Ver estoque" : "Ver histórico"}
          </button>
        </div>
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
      ) : historicoAberto ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {movimentacoes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Nenhuma movimentação ainda.</p>
            ) : (
              movimentacoes.map((mv) => (
                <div key={mv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">
                      {nomeDoMaterial(mv.material_id)}
                      {mv.observacao && <span className="text-slate-400 font-normal"> — {mv.observacao}</span>}
                    </p>
                    <p className="text-xs text-slate-400">{mv.responsavel_nome} · {new Date(mv.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <span className={`text-sm font-bold ${mv.tipo === "entrada" ? "text-emerald-600" : "text-red-500"}`}>
                    {mv.tipo === "entrada" ? "+" : "−"}{mv.quantidade}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-100">
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
                    onClick={() => abrirEntrada(m)}
                    className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1 flex-shrink-0">
                    <Plus size={11} /> Entrada
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lancando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setLancando(null); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Registrar entrada — {lancando.nome}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tem {lancando.quantidade_atual} {lancando.unidade} no estoque</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Quantidade comprada ({lancando.unidade})</label>
              <input type="number" min="1" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Observação (opcional)</label>
              <input type="text" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: compra do mercado X"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLancando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={confirmarEntrada} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {novoProdutoAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setNovoProdutoAberto(false); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Novo produto</h3>
              <p className="text-xs text-slate-400 mt-0.5">Cadastra um item novo no estoque, começando com 0</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nome</label>
              <input type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Álcool em gel"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Unidade</label>
              <input type="text" value={novaUnidade} onChange={(e) => setNovaUnidade(e.target.value)} placeholder="un, pacote, rolo, litro..."
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Estoque mínimo (opcional)</label>
              <input type="number" min="0" step="1" value={novaQtdMinima} onChange={(e) => setNovaQtdMinima(e.target.value)} placeholder="Avisa quando chegar nesse número"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setNovoProdutoAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={confirmarNovoProduto} disabled={criandoProduto}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                {criandoProduto ? "Salvando..." : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
