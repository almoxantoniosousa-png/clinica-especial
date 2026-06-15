"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { Users, Plus, Pencil, Trash2, X, Check, Mail, Phone, Baby, Power, User, MapPin, CreditCard } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

export default function ResponsaveisPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoNome, setDeletandoNome] = useState<string>("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [form, setForm] = useState({
    nome: "", cpf: "", endereco: "", telefone: "", email: "", crianca_id: "", ativo: true,
  });

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function getUsuarioLogado() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  const carregar = async () => {
    setLoading(true);
    const [{ data: resp }, { data: cri }] = await Promise.all([
      supabase.from("responsaveis").select("*, criancas(nome, foto_url)").order("nome"),
      supabase.from("criancas").select("id, nome").order("nome"),
    ]);
    setResponsaveis(resp || []);
    setCriancas(cri || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", cpf: "", endereco: "", telefone: "", email: "", crianca_id: "", ativo: true });
    setModalAberto(true);
  }

  function abrirEditar(r: any) {
    setEditando(r);
    setForm({
      nome: r.nome || "", cpf: r.cpf || "", endereco: r.endereco || "",
      telefone: r.telefone || "", email: r.email || "",
      crianca_id: r.crianca_id || "", ativo: r.ativo ?? true,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome.trim() || !form.email.trim() || !form.crianca_id) {
      mostrarFeedback("erro", "Preencha nome, email e vincule uma criança.");
      return;
    }
    setSalvando(true);
    const user = await getUsuarioLogado();

    if (editando) {
      const { error } = await supabase.from("responsaveis").update(form).eq("id", editando.id);
      if (error) mostrarFeedback("erro", error.message);
      else {
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Editou",
          tabela: "responsaveis",
          registro_id: editando.id,
          descricao: `Editou o responsável: ${form.nome.trim()}`,
        });
        mostrarFeedback("sucesso", "Responsável atualizado!");
        carregar();
      }
    } else {
      const { data: novo, error } = await supabase.from("responsaveis").insert(form).select().single();
      if (error) mostrarFeedback("erro", error.message);
      else {
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Criou",
          tabela: "responsaveis",
          registro_id: novo?.id,
          descricao: `Cadastrou o responsável: ${form.nome.trim()} (email: ${form.email})`,
        });
        mostrarFeedback("sucesso", "Responsável cadastrado!");
        carregar();
      }
    }
    setSalvando(false);
    setModalAberto(false);
  }

  async function deletar(id: string) {
    const user = await getUsuarioLogado();
    const { error } = await supabase.from("responsaveis").delete().eq("id", id);
    if (error) mostrarFeedback("erro", error.message);
    else {
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: "responsaveis",
        registro_id: id,
        descricao: `Removeu o responsável: ${deletandoNome}`,
      });
      mostrarFeedback("sucesso", "Responsável removido.");
      carregar();
    }
    setDeletandoId(null);
    setDeletandoNome("");
  }

  async function toggleAtivo(id: string, ativo: boolean, nome: string) {
    const user = await getUsuarioLogado();
    await supabase.from("responsaveis").update({ ativo: !ativo }).eq("id", id);
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: ativo ? "Desativou" : "Ativou",
      tabela: "responsaveis",
      registro_id: id,
      descricao: `${ativo ? "Desativou" : "Ativou"} o acesso do responsável: ${nome}`,
    });
    carregar();
  }

  const filtrados = responsaveis.filter((r) =>
    r.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (r.email || "").toLowerCase().includes(busca.toLowerCase()) ||
    (r.criancas?.nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const inputClass = "w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400 bg-white";
  const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5";

  return (
    <div className="space-y-6 pb-10">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Portal da Família</h1>
          <p className="text-xs text-slate-400 mt-0.5">{responsaveis.length} responsável{responsaveis.length !== 1 ? "is" : ""} · {responsaveis.filter(r => r.ativo).length} ativo{responsaveis.filter(r => r.ativo).length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
          <Plus className="h-4 w-4" />
          Novo
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <input type="text" placeholder="Buscar por nome, email ou criança..." value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full sm:w-96 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">{busca ? "Nenhum responsável encontrado." : "Nenhum responsável cadastrado ainda."}</p>
          {!busca && <button onClick={abrirNovo} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">Cadastrar primeiro responsável</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((r) => (
            <div key={r.id} className={`bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition
              ${r.ativo ? "border-slate-200 hover:border-blue-200 hover:shadow-sm" : "border-slate-100 bg-slate-50/60 opacity-70"}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm ring-1 ring-slate-100">
                  {r.criancas?.foto_url ? (
                    <img src={r.criancas.foto_url} alt={r.criancas.nome} className="w-full h-full object-cover"/>
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-bold text-sm
                      ${r.ativo ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-400"}`}>
                      {iniciais(r.nome)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{r.nome}</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold tracking-wide ${r.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                      {r.ativo ? "ATIVO" : "INATIVO"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {r.email}</span>
                    {r.telefone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {r.telefone}</span>}
                  </div>
                  {r.criancas?.nome && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                      <Baby className="h-3.5 w-3.5" /> {r.criancas.nome}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 sm:border-l border-slate-100 sm:pl-4 self-end sm:self-center">
                <button onClick={() => toggleAtivo(r.id, r.ativo, r.nome)}
                  className={`flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border transition
                    ${r.ativo ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"}`}>
                  <Power className="h-3.5 w-3.5" />
                  {r.ativo ? "Desativar" : "Ativar"}
                </button>
                <button onClick={() => abrirEditar(r)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => { setDeletandoId(r.id); setDeletandoNome(r.nome); }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white">{editando ? "Editar responsável" : "Novo responsável"}</h2>
                  <p className="text-blue-200 text-xs">Acesso ao Portal da Família</p>
                </div>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <label className={labelClass}><Baby className="h-3.5 w-3.5" /> Criança vinculada *</label>
                <select value={form.crianca_id} onChange={(e) => setForm({ ...form, crianca_id: e.target.value })}
                  className={inputClass}>
                  <option value="">Selecione a criança...</option>
                  {criancas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}><User className="h-3.5 w-3.5" /> Nome completo *</label>
                  <input type="text" placeholder="Nome do responsável" value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })} autoFocus className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}><CreditCard className="h-3.5 w-3.5" /> CPF</label>
                  <input type="text" placeholder="000.000.000-00" value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}><Phone className="h-3.5 w-3.5" /> Telefone / WhatsApp</label>
                  <input type="text" placeholder="(71) 99999-9999" value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={inputClass}/>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}><Mail className="h-3.5 w-3.5" /> E-mail * (usado para login)</label>
                  <input type="email" placeholder="email@exemplo.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass}/>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}><MapPin className="h-3.5 w-3.5" /> Endereço</label>
                  <input type="text" placeholder="Rua, número - Bairro - Salvador/BA" value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })} className={inputClass}/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalAberto(false)}
                  className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando || !form.nome.trim() || !form.email.trim() || !form.crianca_id}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                  <Check className="h-4 w-4" />
                  {salvando ? "Salvando..." : "Salvar responsável"}
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
                <h3 className="font-bold text-slate-800 text-lg">Remover responsável?</h3>
                <p className="text-sm text-slate-500 mt-1">O acesso ao portal será revogado.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setDeletandoId(null); setDeletandoNome(""); }}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
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