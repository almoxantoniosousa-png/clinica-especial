"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { Users, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

const CARGOS = ["Auxiliar Administrativa", "Agente de Limpeza"];

export default function InternasPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [colaboradoras, setColaboradoras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoNome, setDeletandoNome] = useState<string>("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [form, setForm] = useState({
    nome: "", email: "", cargo: CARGOS[0], cpf: "", rg: "",
    data_nascimento: "", data_admissao: "", whatsapp: "", endereco: "",
    cnpj: "", razao_social: "",
  });

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function getUsuarioLogado() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  const carregarColaboradoras = async () => {
    setLoading(true);
    const { data } = await supabase.from("colaboradoras_internas").select("*").order("nome");
    setColaboradoras(data || []);
    setLoading(false);
  };

  useEffect(() => { carregarColaboradoras(); }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", email: "", cargo: CARGOS[0], cpf: "", rg: "", data_nascimento: "", data_admissao: "", whatsapp: "", endereco: "", cnpj: "", razao_social: "" });
    setModalAberto(true);
  }

  function abrirEditar(col: any) {
    setEditando(col);
    setForm({
      nome: col.nome || "", email: col.email || "", cargo: col.cargo || CARGOS[0],
      cpf: col.cpf || "", rg: col.rg || "",
      data_nascimento: col.data_nascimento || "", data_admissao: col.data_admissao || "",
      whatsapp: col.whatsapp || "", endereco: col.endereco || "",
      cnpj: col.cnpj || "", razao_social: col.razao_social || "",
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome.trim()) return;
    setSalvando(true);
    const payload = {
      ...form,
      data_nascimento: form.data_nascimento || null,
      data_admissao: form.data_admissao || null,
    };
    const user = await getUsuarioLogado();

    if (editando) {
      const { error } = await supabase.from("colaboradoras_internas").update(payload).eq("id", editando.id);
      if (error) mostrarFeedback("erro", error.message);
      else {
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Editou",
          tabela: "colaboradoras_internas",
          registro_id: editando.id,
          descricao: `Editou a colaboradora: ${form.nome.trim()}`,
        });
        mostrarFeedback("sucesso", "Colaboradora atualizada!");
        carregarColaboradoras();
      }
    } else {
      const { data: nova, error } = await supabase.from("colaboradoras_internas").insert(payload).select().single();
      if (error) mostrarFeedback("erro", error.message);
      else {
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Criou",
          tabela: "colaboradoras_internas",
          registro_id: nova?.id,
          descricao: `Cadastrou a colaboradora: ${form.nome.trim()} (${form.cargo})`,
        });
        mostrarFeedback("sucesso", "Colaboradora cadastrada!");
        carregarColaboradoras();
      }
    }
    setSalvando(false);
    setModalAberto(false);
  }

  async function deletar(id: string) {
    const user = await getUsuarioLogado();
    const { error } = await supabase.from("colaboradoras_internas").delete().eq("id", id);
    if (error) mostrarFeedback("erro", error.message);
    else {
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: "colaboradoras_internas",
        registro_id: id,
        descricao: `Removeu a colaboradora: ${deletandoNome}`,
      });
      mostrarFeedback("sucesso", "Colaboradora removida.");
      carregarColaboradoras();
    }
    setDeletandoId(null);
    setDeletandoNome("");
  }

  const filtradas = colaboradoras.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.cargo.toLowerCase().includes(busca.toLowerCase())
  );

  const auxAdm = filtradas.filter(c => c.cargo === "Auxiliar Administrativa");
  const limpeza = filtradas.filter(c => c.cargo === "Agente de Limpeza");

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const inputClass = "w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition";

  function CardColaboradora({ col }: { col: any }) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-sm shrink-0">
              {iniciais(col.nome)}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{col.nome}</p>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{col.cargo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => abrirEditar(col)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => { setDeletandoId(col.id); setDeletandoNome(col.nome); }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {col.email && <p className="text-xs text-slate-400">✉️ {col.email}</p>}
          {col.whatsapp && <p className="text-xs text-slate-400">📱 {col.whatsapp}</p>}
          {col.cpf && <p className="text-xs text-slate-400">CPF: {col.cpf}</p>}
          {col.data_admissao && <p className="text-xs text-slate-400">📅 Admissão: {new Date(col.data_admissao).toLocaleDateString("pt-BR")}</p>}
          {col.endereco && <p className="text-xs text-slate-400">📍 {col.endereco}</p>}
          {col.cnpj && <p className="text-xs text-slate-400">🏢 CNPJ: {col.cnpj}</p>}
          {col.razao_social && <p className="text-xs text-slate-400">📋 Razão Social: {col.razao_social}</p>}
        </div>
      </div>
    );
  }

  function SecaoLista({ titulo, items, cor }: { titulo: string; items: any[]; cor: string }) {
    return items.length > 0 ? (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-700">{titulo}</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cor}`}>{items.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(col => <CardColaboradora key={col.id} col={col} />)}
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Colaboradoras Internas</h1>
          <p className="text-xs text-slate-400 mt-0.5">Auxiliar Administrativa e Agente de Limpeza</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" /> Nova colaboradora
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input type="text" placeholder="Buscar colaboradora..." value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72" />
        <span className="text-sm text-slate-400">{filtradas.length} colaboradora{filtradas.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">{busca ? "Nenhuma colaboradora encontrada." : "Nenhuma colaboradora cadastrada ainda."}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <SecaoLista titulo="Auxiliar Administrativa" items={auxAdm} cor="bg-purple-100 text-purple-700" />
          <SecaoLista titulo="Agente de Limpeza" items={limpeza} cor="bg-emerald-100 text-emerald-700" />
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{editando ? "Editar colaboradora" : "Nova colaboradora"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome *</label>
                  <input type="text" placeholder="Nome completo" value={form.nome} autoFocus
                    onChange={(e) => setForm({ ...form, nome: e.target.value })} className={`mt-1 ${inputClass}`} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo *</label>
                  <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className={`mt-1 ${inputClass}`}>
                    {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CPF</label>
                  <input type="text" placeholder="000.000.000-00" value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })} className={`mt-1 ${inputClass}`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RG</label>
                  <input type="text" placeholder="00.000.000-00" value={form.rg}
                    onChange={(e) => setForm({ ...form, rg: e.target.value })} className={`mt-1 ${inputClass}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nascimento</label>
                  <input type="date" value={form.data_nascimento}
                    onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} className={`mt-1 ${inputClass}`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admissão</label>
                  <input type="date" value={form.data_admissao}
                    onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} className={`mt-1 ${inputClass}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                  <input type="email" placeholder="email@exemplo.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} className={`mt-1 ${inputClass}`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">WhatsApp</label>
                  <input type="text" placeholder="(71) 99999-9999" value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className={`mt-1 ${inputClass}`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Endereço</label>
                <input type="text" placeholder="Rua, número - Bairro - Salvador/BA" value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })} className={`mt-1 ${inputClass}`} />
              </div>
            </div>

            {/* CNPJ e Razão Social */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CNPJ</label>
                <input type="text" placeholder="00.000.000/0001-00" value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Razão Social</label>
                <input type="text" placeholder="Nome da empresa (MEI, etc.)" value={form.razao_social}
                  onChange={(e) => setForm({ ...form, razao_social: e.target.value })} className={`mt-1 ${inputClass}`} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !form.nome.trim()}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Remover colaboradora?</h3>
                <p className="text-sm text-slate-500 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDeletandoId(null); setDeletandoNome(""); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={() => deletar(deletandoId)}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}