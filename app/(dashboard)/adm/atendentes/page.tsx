"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";

export default function CadastrarAtendentePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [registro, setRegistro] = useState("");

  // Feedback inline
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  // Modal de edição
  const [editando, setEditando] = useState<any | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  const carregarAtendentes = async () => {
    setLoadingLista(true);
    const { data } = await supabase.from("atendentes").select("*").order("nome");
    setAtendentes(data || []);
    setLoadingLista(false);
  };

  useEffect(() => { carregarAtendentes(); }, [supabase]);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("atendentes").insert([{
      nome, email, especialidade, whatsapp,
      registro_profissional: registro,
      role: "atendente"
    }]);
    if (error) {
      mostrarFeedback("erro", "Erro ao cadastrar: " + error.message);
    } else {
      mostrarFeedback("sucesso", "Atendente cadastrado com sucesso!");
      setNome(""); setEmail(""); setEspecialidade(""); setWhatsapp(""); setRegistro("");
      carregarAtendentes();
    }
    setLoading(false);
  };

  async function salvarEdicao() {
    if (!editando) return;
    setSalvandoEdicao(true);
    const { error } = await supabase.from("atendentes").update({
      nome: editando.nome,
      especialidade: editando.especialidade,
      whatsapp: editando.whatsapp,
      registro_profissional: editando.registro_profissional,
    }).eq("id", editando.id);
    setSalvandoEdicao(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao editar: " + error.message);
    } else {
      setEditando(null);
      carregarAtendentes();
      mostrarFeedback("sucesso", "Atendente atualizado com sucesso!");
    }
  }

  async function excluirAtendente(id: string, nome: string) {
    if (!confirm(`Remover "${nome}" da lista?`)) return;
    const { error } = await supabase.from("atendentes").delete().eq("id", id);
    if (error) {
      mostrarFeedback("erro", "Erro ao excluir: " + error.message);
    } else {
      carregarAtendentes();
      mostrarFeedback("sucesso", "Atendente removido.");
    }
  }

  const atendenteFiltrados = atendentes.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.especialidade || "").toLowerCase().includes(busca.toLowerCase())
  );

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const coresAvatar = [
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];

  function corAvatar(nome: string) {
    return coresAvatar[nome.charCodeAt(0) % coresAvatar.length];
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">
            Gestão de Atendentes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre e gerencie os profissionais da clínica.
          </p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          {atendentes.length} profissionais
        </span>
      </div>

      {/* FEEDBACK */}
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

      {/* FORMULÁRIO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Novo Atendente</h2>
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium">
            Cadastro rápido
          </span>
        </div>

        <form onSubmit={handleCadastrar} className="space-y-4">
          {/* Nome e Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Nome completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ana Paula Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  placeholder:text-slate-400 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                E-mail *
              </label>
              <input
                type="email"
                required
                placeholder="Ex: ana@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  placeholder:text-slate-400 transition"
              />
            </div>
          </div>

          {/* Especialidade e Registro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Especialidade
              </label>
              <input
                type="text"
                placeholder="Ex: Fonoaudiologia"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  placeholder:text-slate-400 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Registro (CRP/CRM)
              </label>
              <input
                type="text"
                placeholder="Ex: CRP 06/123456"
                value={registro}
                onChange={(e) => setRegistro(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  placeholder:text-slate-400 transition"
              />
            </div>
          </div>

          {/* WhatsApp e botão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                WhatsApp
              </label>
              <input
                type="text"
                placeholder="Ex: (11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                  placeholder:text-slate-400 transition"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white
                  font-semibold text-sm rounded-xl transition-all disabled:opacity-50
                  disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Cadastrando...
                  </span>
                ) : "Cadastrar Atendente"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* LISTA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Cabeçalho com busca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-700 text-sm">Lista de Profissionais</h3>
          <div className="relative w-full sm:w-60">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou especialidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                placeholder:text-slate-400 transition"
            />
          </div>
        </div>

        {/* Lista */}
        {loadingLista ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="animate-spin h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-sm text-slate-400">Carregando...</p>
          </div>
        ) : atendenteFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">👩‍⚕️</span>
            <p className="text-sm text-slate-400 font-medium">
              {busca ? "Nenhum profissional encontrado." : "Nenhum atendente cadastrado ainda."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {atendenteFiltrados.map((at) => (
              <li key={at.id} className="px-5 py-4 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-3">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(at.nome)}`}>
                      {iniciais(at.nome)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{at.nome}</p>
                      <p className="text-xs text-slate-500 truncate">{at.email}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {at.especialidade && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            {at.especialidade}
                          </span>
                        )}
                        {at.registro_profissional && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {at.registro_profissional}
                          </span>
                        )}
                        {at.whatsapp && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            {at.whatsapp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditando({ ...at })}
                      className="h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100
                        active:scale-95 rounded-lg border border-blue-100 transition-all"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluirAtendente(at.id, at.nome)}
                      className="h-9 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100
                        active:scale-95 rounded-lg border border-red-100 transition-all"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Rodapé */}
        {!loadingLista && atendenteFiltrados.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">
              Mostrando {atendenteFiltrados.length} de {atendentes.length} profissional{atendentes.length !== 1 ? "is" : ""}
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
          <div className="w-full sm:max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">Editar atendente</h3>
              <button
                onClick={() => setEditando(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome</label>
                <input
                  type="text"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  autoFocus
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Especialidade</label>
                <input
                  type="text"
                  value={editando.especialidade || ""}
                  onChange={(e) => setEditando({ ...editando, especialidade: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Registro</label>
                  <input
                    type="text"
                    value={editando.registro_profissional || ""}
                    onChange={(e) => setEditando({ ...editando, registro_profissional: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                      focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp</label>
                  <input
                    type="text"
                    value={editando.whatsapp || ""}
                    onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                      focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold
                  hover:bg-slate-50 active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao || !editando.nome?.trim()}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm
                  font-semibold active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
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