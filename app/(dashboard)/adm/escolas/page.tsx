"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { School, Plus, Pencil, Trash2, X, Check, MapPin, Phone, User } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

const CORES = [
  { bg: "from-blue-500 to-blue-600", light: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { bg: "from-purple-500 to-purple-600", light: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { bg: "from-emerald-500 to-emerald-600", light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "from-amber-500 to-amber-600", light: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { bg: "from-rose-500 to-rose-600", light: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  { bg: "from-cyan-500 to-cyan-600", light: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
];

function corEscola(nome: string) {
  return CORES[nome.charCodeAt(0) % CORES.length];
}

export default function EscolasPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoNome, setDeletandoNome] = useState<string>("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [form, setForm] = useState({ nome: "", endereco: "", coordenacao: "", telefone: "" });

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function getUsuarioLogado() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  const carregarEscolas = async () => {
    setLoading(true);
    const { data } = await supabase.from("escolas").select("*").order("nome");
    setEscolas(data || []);
    setLoading(false);
  };

  useEffect(() => { carregarEscolas(); }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", endereco: "", coordenacao: "", telefone: "" });
    setModalAberto(true);
  }

  function abrirEditar(escola: any) {
    setEditando(escola);
    setForm({ nome: escola.nome || "", endereco: escola.endereco || "", coordenacao: escola.coordenacao || "", telefone: escola.telefone || "" });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome.trim()) return;
    setSalvando(true);
    const user = await getUsuarioLogado();

    if (editando) {
      const { error } = await supabase.from("escolas").update(form).eq("id", editando.id);
      if (error) mostrarFeedback("erro", error.message);
      else {
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Editou",
          tabela: "escolas",
          registro_id: editando.id,
          descricao: `Editou a escola: ${form.nome.trim()}`,
        });
        mostrarFeedback("sucesso", "Escola atualizada!");
        carregarEscolas();
      }
    } else {
      const { data: nova, error } = await supabase.from("escolas").insert(form).select().single();
      if (error) mostrarFeedback("erro", error.message);
      else {
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Criou",
          tabela: "escolas",
          registro_id: nova?.id,
          descricao: `Cadastrou a escola: ${form.nome.trim()}`,
        });
        mostrarFeedback("sucesso", "Escola cadastrada!");
        carregarEscolas();
      }
    }
    setSalvando(false);
    setModalAberto(false);
  }

  async function deletar(id: string) {
    const user = await getUsuarioLogado();
    const { error } = await supabase.from("escolas").delete().eq("id", id);
    if (error) mostrarFeedback("erro", error.message);
    else {
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: "escolas",
        registro_id: id,
        descricao: `Removeu a escola: ${deletandoNome}`,
      });
      mostrarFeedback("sucesso", "Escola removida.");
      carregarEscolas();
    }
    setDeletandoId(null);
    setDeletandoNome("");
  }

  const filtradas = escolas.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (e.coordenacao || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">

      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <School className="h-6 w-6" /> Escolas Parceiras
          </h1>
          <p className="text-blue-200 text-sm mt-1">Gerencie as escolas vinculadas à clínica</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {escolas.length} escola{escolas.length !== 1 ? "s" : ""} cadastrada{escolas.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 px-5 py-3 bg-white text-blue-900 rounded-xl text-sm font-bold hover:bg-blue-50 transition shadow-lg">
          <Plus className="h-4 w-4" />
          Nova escola
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="relative">
        <School className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" placeholder="Buscar escola por nome ou coordenação..." value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">{busca ? "Nenhuma escola encontrada." : "Nenhuma escola cadastrada ainda."}</p>
          {!busca && <button onClick={abrirNovo} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">Cadastrar primeira escola</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtradas.map((escola) => {
            const cor = corEscola(escola.nome);
            return (
              <div key={escola.id} className={`bg-white rounded-2xl border ${cor.border} overflow-hidden hover:shadow-md transition group`}>
                <div className={`bg-gradient-to-r ${cor.bg} px-5 py-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <School className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{escola.nome}</p>
                      {escola.coordenacao && (
                        <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" /> {escola.coordenacao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => abrirEditar(escola)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition">
                      <Pencil className="h-4 w-4 text-white" />
                    </button>
                    <button onClick={() => { setDeletandoId(escola.id); setDeletandoNome(escola.nome); }}
                      className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition">
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {escola.endereco ? (
                    <p className="text-xs text-slate-500 flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />{escola.endereco}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 italic">Endereço não informado</p>
                  )}
                  {escola.telefone && (
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />{escola.telefone}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <School className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white">{editando ? "Editar escola" : "Nova escola"}</h2>
                  <p className="text-blue-200 text-xs">{editando ? "Atualize os dados" : "Preencha os dados da escola"}</p>
                </div>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <School className="h-3.5 w-3.5" /> Nome da escola *
                </label>
                <input type="text" placeholder="Ex: Escola Municipal João XXIII" value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })} autoFocus
                  className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <User className="h-3.5 w-3.5" /> Coordenação
                </label>
                <input type="text" placeholder="Ex: Maria Silva" value={form.coordenacao}
                  onChange={(e) => setForm({ ...form, coordenacao: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3.5 w-3.5" /> Telefone
                </label>
                <input type="text" placeholder="Ex: (71) 3333-4444" value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Endereço
                </label>
                <input type="text" placeholder="Ex: Rua das Flores, 123 - Salvador/BA" value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalAberto(false)}
                  className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando || !form.nome.trim()}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                  <Check className="h-4 w-4" />
                  {salvando ? "Salvando..." : "Salvar escola"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Remover escola?</h3>
                <p className="text-sm text-slate-500 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDeletandoId(null); setDeletandoNome(""); }}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={() => deletar(deletandoId)}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition">
                Sim, remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}