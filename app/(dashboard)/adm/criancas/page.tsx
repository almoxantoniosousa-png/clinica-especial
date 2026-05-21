"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createCrianca } from "@/app/actions";

export default function AdmCriancasPage() {
  const [criancas, setCriancas] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  // Modal de edição
  const [editando, setEditando] = useState<any | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [responsavelEditado, setResponsavelEditado] = useState("");
  const [fotoEditFile, setFotoEditFile] = useState<File | null>(null);
  const [fotoEditPreview, setFotoEditPreview] = useState<string | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const inputFotoEditRef = useRef<HTMLInputElement>(null);

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

  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  function selecionarFotoEdit(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoEditFile(file);
    setFotoEditPreview(URL.createObjectURL(file));
  }

  async function uploadFoto(file: File, criancaId: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${criancaId}.${ext}`;
    const { error } = await supabase.storage
      .from("fotos-criancas")
      .upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("fotos-criancas").getPublicUrl(path);
    return data.publicUrl;
  }

  async function salvarCrianca(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setUploadingFoto(true);

    startTransition(async () => {
      // 1. Inserir criança
      const { data: nova, error } = await supabase
        .from("criancas")
        .insert([{
          nome: nome.trim(),
          data_nascimento: dataNascimento || null,
          responsavel: responsavel.trim() || null,
        }])
        .select()
        .single();

      if (error || !nova) {
        mostrarFeedback("erro", "Erro ao cadastrar: " + error?.message);
        setUploadingFoto(false);
        return;
      }

      // 2. Upload da foto se selecionada
      if (fotoFile) {
        const url = await uploadFoto(fotoFile, nova.id);
        if (url) {
          await supabase.from("criancas").update({ foto_url: url }).eq("id", nova.id);
        }
      }

      setNome(""); setDataNascimento(""); setResponsavel("");
      setFotoFile(null); setFotoPreview(null);
      setUploadingFoto(false);
      carregarCriancas();
      mostrarFeedback("sucesso", "Criança cadastrada com sucesso!");
    });
  }

  function abrirEdicao(crianca: any) {
    setEditando(crianca);
    setNomeEditado(crianca.nome);
    setResponsavelEditado(crianca.responsavel || "");
    setFotoEditPreview(crianca.foto_url || null);
    setFotoEditFile(null);
  }

  async function salvarEdicao() {
    if (!editando || !nomeEditado.trim()) return;
    setSalvandoEdicao(true);

    let foto_url = editando.foto_url;

    // Upload nova foto se selecionada
    if (fotoEditFile) {
      const url = await uploadFoto(fotoEditFile, editando.id);
      if (url) foto_url = url;
    }

    const { error } = await supabase
      .from("criancas")
      .update({
        nome: nomeEditado.trim(),
        responsavel: responsavelEditado.trim() || null,
        foto_url,
      })
      .eq("id", editando.id);

    setSalvandoEdicao(false);
    setEditando(null);
    setFotoEditFile(null);
    setFotoEditPreview(null);

    if (error) {
      mostrarFeedback("erro", "Erro ao editar: " + error.message);
    } else {
      carregarCriancas();
      mostrarFeedback("sucesso", "Criança atualizada com sucesso!");
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
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.responsavel || "").toLowerCase().includes(busca.toLowerCase())
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
    return coresAvatar[nome.charCodeAt(0) % coresAvatar.length];
  }

  function calcularIdade(dataNasc: string) {
    if (!dataNasc) return null;
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    const anos = hoje.getFullYear() - nasc.getFullYear();
    const meses = hoje.getMonth() - nasc.getMonth();
    if (anos === 0) return `${meses} meses`;
    return `${anos} anos`;
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
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>
          {criancas.length} cadastradas
        </span>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Nova Criança</h2>
          <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
            Cadastro completo
          </span>
        </div>

        <form onSubmit={salvarCrianca} className="space-y-4">

          {/* FOTO + NOME */}
          <div className="flex items-start gap-4">
            {/* Upload de foto */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                onClick={() => inputFotoRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400
                  flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50
                  hover:bg-blue-50 transition group relative"
              >
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover"/>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs text-slate-400 group-hover:text-blue-500 transition">Foto</span>
                  </div>
                )}
              </div>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={selecionarFoto}
              />
              {fotoPreview && (
                <button
                  type="button"
                  onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                  className="text-xs text-red-500 hover:text-red-700 transition"
                >
                  Remover
                </button>
              )}
            </div>

            {/* Campos de texto */}
            <div className="flex-1 space-y-3">
              <input
                type="text"
                required
                placeholder="Nome completo da criança *"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <input
                  type="text"
                  placeholder="Nome do responsável"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || uploadingFoto || !nome.trim()}
            className="w-full h-12 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-semibold
              text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isPending || uploadingFoto ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {uploadingFoto ? "Enviando foto..." : "Salvando..."}
              </span>
            ) : "Cadastrar Criança"}
          </button>
        </form>
      </div>

      {/* LISTA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-700 text-sm">Crianças cadastradas</h3>
          <div className="relative w-full sm:w-56">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou responsável..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400"
            />
          </div>
        </div>

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
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar com foto ou iniciais */}
                  <div className="w-11 h-11 flex-shrink-0 rounded-full overflow-hidden border border-slate-200">
                    {c.foto_url ? (
                      <img src={c.foto_url} alt={c.nome} className="w-full h-full object-cover"/>
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${corAvatar(c.nome)}`}>
                        {iniciais(c.nome)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{c.nome}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {c.data_nascimento && (
                        <span className="text-xs text-slate-400">
                          {calcularIdade(c.data_nascimento)}
                        </span>
                      )}
                      {c.responsavel && (
                        <span className="text-xs text-slate-400">· {c.responsavel}</span>
                      )}
                    </div>
                  </div>
                </div>
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
          <div className="w-full sm:max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">Editar criança</h3>
              <button onClick={() => setEditando(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition">
                ✕
              </button>
            </div>

            {/* Foto de edição */}
            <div className="flex items-center gap-4">
              <div
                onClick={() => inputFotoEditRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400
                  flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 transition"
              >
                {fotoEditPreview ? (
                  <img src={fotoEditPreview} alt="Preview" className="w-full h-full object-cover"/>
                ) : (
                  <span className="text-2xl">📷</span>
                )}
              </div>
              <input ref={inputFotoEditRef} type="file" accept="image/*" className="hidden" onChange={selecionarFotoEdit}/>
              <div className="flex-1 space-y-2">
                <p className="text-xs text-slate-500">Clique na foto para alterar</p>
                {fotoEditPreview && fotoEditFile && (
                  <button type="button" onClick={() => { setFotoEditFile(null); setFotoEditPreview(editando.foto_url || null); }}
                    className="text-xs text-red-500 hover:text-red-700">
                    Desfazer alteração
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome completo</label>
                <input type="text" value={nomeEditado} onChange={(e) => setNomeEditado(e.target.value)} autoFocus
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Responsável</label>
                <input type="text" value={responsavelEditado} onChange={(e) => setResponsavelEditado(e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400"/>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold
                  hover:bg-slate-50 active:scale-95 transition">
                Cancelar
              </button>
              <button onClick={salvarEdicao} disabled={salvandoEdicao || !nomeEditado.trim()}
                className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold
                  active:scale-95 transition disabled:opacity-50">
                {salvandoEdicao ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}