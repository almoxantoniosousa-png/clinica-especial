"use client";

import { useState, useEffect, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createCrianca } from "@/app/actions";

export default function AdmCriancasPage() {
  const [criancas, setCriancas] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal de edição
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Feedback inline (sem alert)
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregarCriancas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("criancas")
      .select("*")
      .order("nome", { ascending: true });
    if (error) mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    if (data) setCriancas(data);
    setLoading(false);
  }

  useEffect(() => { carregarCriancas(); }, []);

  function salvarCrianca(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    startTransition(async () => {
      const res = await createCrianca({ nome: nome.trim() });
      if (res?.error) {
        mostrarFeedback("erro", "Erro ao cadastrar: " + res.error);
      } else {
        setNome("");
        carregarCriancas();
        mostrarFeedback("sucesso", "Criança cadastrada com sucesso!");
      }
    });
  }

  function abrirEdicao(crianca: { id: string; nome: string }) {
    setEditando(crianca);
    setNomeEditado(crianca.nome);
  }

  async function salvarEdicao() {
    if (!editando || !nomeEditado.trim()) return;
    setSalvandoEdicao(true);
    const { error } = await supabase
      .from("criancas")
      .update({ nome: nomeEditado.trim() })
      .eq("id", editando.id);
    setSalvandoEdicao(false);
    setEditando(null);
    if (error) {
      mostrarFeedback("erro", "Erro ao editar: " + error.message);
    } else {
      carregarCriancas();
      mostrarFeedback("sucesso", "Nome atualizado com sucesso!");
    }
  }

  async function excluirCrianca(id: string, nome: string) {
    if (!confirm(`Remover "${nome}" da lista?`)) return;
    const { error } = await supabase.from("criancas").delete().eq("id", id);
    if (error) {
      mostrarFeedback("erro", "Erro ao excluir: " + error.message);
    } else {
      carregarCriancas();
      mostrarFeedback("sucesso", "Criança removida.");
    }
  }

  const criancasFiltradas = criancas.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const coresAvatar = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];

  function corAvatar(nome: string) {
    const idx = nome.charCodeAt(0) % coresAvatar.length;
    return coresAvatar[idx];
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">
            Gestão de Crianças
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre e gerencie as crianças atendidas pela clínica.
          </p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
          {criancas.length} cadastradas
        </span>
      </div>

      {/* FEEDBACK INLINE */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}
        >
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Nova Criança</h2>
          <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
            Cadastro rápido
          </span>
        </div>

        <form onSubmit={salvarCrianca} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Ex: Maria Eduarda Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder:text-slate-400 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !nome.trim()}
            className="h-12 px-6 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-semibold
              text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed
              whitespace-nowrap shadow-sm"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Salvando...
              </span>
            ) : "Cadastrar"}
          </button>
        </form>
      </div>

      {/* LISTA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Cabeçalho da lista com busca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-700 text-sm">
            Crianças cadastradas
          </h3>
          <div className="relative w-full sm:w-56">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                placeholder:text-slate-400 transition"
            />
          </div>
        </div>

        {/* Conteúdo da lista */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-sm text-slate-400">Carregando...</p>
          </div>
        ) : criancasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">👶</span>
            <p className="text-sm text-slate-400 font-medium">
              {busca ? "Nenhuma criança encontrada." : "Nenhuma criança cadastrada ainda."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {criancasFiltradas.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition"
              >
                {/* Avatar + nome */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(c.nome)}`}>
                    {iniciais(c.nome)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{c.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Desde {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => abrirEdicao(c)}
                    className="h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100
                      active:scale-95 rounded-lg border border-blue-100 transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => excluirCrianca(c.id, c.nome)}
                    className="h-9 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100
                      active:scale-95 rounded-lg border border-red-100 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Rodapé com contagem filtrada */}
        {!loading && criancasFiltradas.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">
              Mostrando {criancasFiltradas.length} de {criancas.length} criança{criancas.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setEditando(null); }}
        >
          <div className="w-full sm:max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">Editar criança</h3>
              <button
                onClick={() => setEditando(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nome completo</label>
              <input
                type="text"
                value={nomeEditado}
                onChange={(e) => setNomeEditado(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(); if (e.key === "Escape") setEditando(null); }}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold
                  hover:bg-slate-50 active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao || !nomeEditado.trim()}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold
                  active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvandoEdicao ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}