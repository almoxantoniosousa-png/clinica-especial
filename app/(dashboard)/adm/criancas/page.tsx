"use client";

import { useState, useEffect, useTransition, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";

function Secao({ titulo, icone, children }: { titulo: string; icone: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <span className="text-base">{icone}</span>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{titulo}</h3>
      </div>
      {children}
    </div>
  );
}

export default function AdmCriancasPage() {
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const [criancas, setCriancas] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [listaAberta, setListaAberta] = useState(true);
  const [busca, setBusca] = useState("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const inputFotoEditRef = useRef<HTMLInputElement>(null);

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "", cpf: "", data_nascimento: "", sexo: "",
    responsavel: "", telefone_responsavel: "", email_responsavel: "",
    escola_id: "", plano_saude: "", numero_processo: "",
    diagnostico: "", cid: "", alergias: "", medicamentos: "", observacoes: "",
  });

  const [editando, setEditando] = useState<any | null>(null);
  const [formEdit, setFormEdit] = useState<any>({});
  const [fotoEditFile, setFotoEditFile] = useState<File | null>(null);
  const [fotoEditPreview, setFotoEditPreview] = useState<string | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function getUsuarioLogado() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  }

  async function carregarDados() {
    setLoading(true);
    const [{ data: criancasData, error }, { data: escolasData }] = await Promise.all([
      supabase.from("criancas").select("*, escolas(nome)").order("nome"),
      supabaseClient.from("escolas").select("id, nome").order("nome"),
    ]);
    if (error) mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    if (criancasData) setCriancas(criancasData);
    if (escolasData) setEscolas(escolasData);
    setLoading(false);
  }

  useEffect(() => { carregarDados(); }, []);

  async function uploadFoto(file: File, criancaId: string): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${criancaId}.${ext}`;
    const { error } = await supabase.storage.from("fotos-criancas").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("fotos-criancas").getPublicUrl(path);
    return data.publicUrl;
  }

  async function salvarCrianca(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setUploadingFoto(true);

    const { data: nova, error } = await supabase.from("criancas").insert([{
      nome: form.nome.trim(),
      cpf: form.cpf || null,
      data_nascimento: form.data_nascimento || null,
      sexo: form.sexo || null,
      responsavel: form.responsavel || null,
      telefone_responsavel: form.telefone_responsavel || null,
      email_responsavel: form.email_responsavel || null,
      escola_id: form.escola_id || null,
      plano_saude: form.plano_saude || null,
      numero_processo: form.numero_processo || null,
      diagnostico: form.diagnostico || null,
      cid: form.cid || null,
      alergias: form.alergias || null,
      medicamentos: form.medicamentos || null,
      observacoes: form.observacoes || null,
    }]).select().single();

    if (error || !nova) {
      mostrarFeedback("erro", "Erro ao cadastrar: " + error?.message);
      setUploadingFoto(false);
      return;
    }

    if (fotoFile) {
      const url = await uploadFoto(fotoFile, nova.id);
      if (url) await supabase.from("criancas").update({ foto_url: url }).eq("id", nova.id);
    }

    // ✅ LOG DE AUDITORIA
    const user = await getUsuarioLogado();
    await registrarLog(supabaseClient, {
      usuario_email: user?.email || "desconhecido",
      acao: "Criou",
      tabela: "criancas",
      registro_id: nova.id,
      descricao: `Cadastrou a criança: ${form.nome.trim()}`,
    });

    setForm({ nome: "", cpf: "", data_nascimento: "", sexo: "", responsavel: "", telefone_responsavel: "", email_responsavel: "", escola_id: "", plano_saude: "", numero_processo: "", diagnostico: "", cid: "", alergias: "", medicamentos: "", observacoes: "" });
    setFotoFile(null); setFotoPreview(null);
    setUploadingFoto(false);
    carregarDados();
    mostrarFeedback("sucesso", "Criança cadastrada com sucesso!");
  }

  function abrirEdicao(crianca: any) {
    setEditando(crianca);
    setFormEdit({
      nome: crianca.nome || "",
      cpf: crianca.cpf || "",
      data_nascimento: crianca.data_nascimento || "",
      sexo: crianca.sexo || "",
      responsavel: crianca.responsavel || "",
      telefone_responsavel: crianca.telefone_responsavel || "",
      email_responsavel: crianca.email_responsavel || "",
      escola_id: crianca.escola_id || "",
      plano_saude: crianca.plano_saude || "",
      numero_processo: crianca.numero_processo || "",
      diagnostico: crianca.diagnostico || "",
      cid: crianca.cid || "",
      alergias: crianca.alergias || "",
      medicamentos: crianca.medicamentos || "",
      observacoes: crianca.observacoes || "",
    });
    setFotoEditPreview(crianca.foto_url || null);
    setFotoEditFile(null);
  }

  async function salvarEdicao() {
    if (!editando || !formEdit.nome?.trim()) return;
    setSalvandoEdicao(true);
    let foto_url = editando.foto_url;
    if (fotoEditFile) {
      const url = await uploadFoto(fotoEditFile, editando.id);
      if (url) foto_url = url;
    }
    const { error } = await supabase.from("criancas").update({
      ...formEdit,
      nome: formEdit.nome.trim(),
      escola_id: formEdit.escola_id || null,
      foto_url,
    }).eq("id", editando.id);

    if (!error) {
      // ✅ LOG DE AUDITORIA
      const user = await getUsuarioLogado();
      await registrarLog(supabaseClient, {
        usuario_email: user?.email || "desconhecido",
        acao: "Editou",
        tabela: "criancas",
        registro_id: editando.id,
        descricao: `Editou o prontuário de: ${formEdit.nome.trim()}`,
      });
    }

    setSalvandoEdicao(false);
    setEditando(null);
    if (error) mostrarFeedback("erro", "Erro ao editar: " + error.message);
    else { carregarDados(); mostrarFeedback("sucesso", "Criança atualizada!"); }
  }

  async function excluirCrianca(id: string, nome: string) {
    if (!confirm(`Remover "${nome}"?`)) return;
    const { error } = await supabase.from("criancas").delete().eq("id", id);

    if (!error) {
      // ✅ LOG DE AUDITORIA
      const user = await getUsuarioLogado();
      await registrarLog(supabaseClient, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: "criancas",
        registro_id: id,
        descricao: `Removeu a criança: ${nome}`,
      });
    }

    if (error) mostrarFeedback("erro", "Erro: " + error.message);
    else { carregarDados(); mostrarFeedback("sucesso", "Criança removida."); }
  }

  const criancasFiltradas = criancas.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.responsavel || "").toLowerCase().includes(busca.toLowerCase()) ||
    (c.escolas?.nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const coresAvatar = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700"];
  function corAvatar(nome: string) { return coresAvatar[nome.charCodeAt(0) % coresAvatar.length]; }

  function calcularIdade(dataNasc: string) {
    if (!dataNasc) return null;
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    const anos = hoje.getFullYear() - nasc.getFullYear();
    const meses = hoje.getMonth() - nasc.getMonth();
    if (anos === 0) return `${meses} meses`;
    return `${anos} anos`;
  }

  const inputClass = "w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 bg-white";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Crianças</h1>
          <p className="text-xs text-slate-400 mt-0.5">Cadastro e prontuário das crianças atendidas.</p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>
          {criancas.length} cadastradas
        </span>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">Nova Criança — Prontuário</h2>
            <p className="text-blue-200 text-xs mt-0.5">Preencha os dados completos do paciente</p>
          </div>
          <span className="text-2xl">👶</span>
        </div>

        <form onSubmit={salvarCrianca} className="p-6 space-y-8">
          <Secao titulo="Identificação" icone="🪪">
            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div onClick={() => inputFotoRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 hover:bg-blue-50 transition group">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover"/>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl">📷</span>
                      <span className="text-xs text-slate-400 group-hover:text-blue-500">Foto</span>
                    </div>
                  )}
                </div>
                <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); } }}/>
                {fotoPreview && <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null); }} className="text-xs text-red-500 hover:text-red-700">Remover</button>}
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nome completo *</label>
                  <input type="text" required placeholder="Nome completo da criança" value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Data de nascimento</label>
                  <input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Sexo</label>
                  <select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} className={inputClass}>
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>CPF</label>
                  <input type="text" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Escola</label>
                  <select value={form.escola_id} onChange={(e) => setForm({ ...form, escola_id: e.target.value })} className={inputClass}>
                    <option value="">Selecione a escola...</option>
                    {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Secao>

          <Secao titulo="Responsável" icone="👨‍👩‍👧">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nome do responsável</label>
                <input type="text" placeholder="Nome completo" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className={inputClass}/>
              </div>
              <div>
                <label className={labelClass}>Telefone / WhatsApp</label>
                <input type="text" placeholder="(71) 99999-9999" value={form.telefone_responsavel} onChange={(e) => setForm({ ...form, telefone_responsavel: e.target.value })} className={inputClass}/>
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input type="email" placeholder="email@exemplo.com" value={form.email_responsavel} onChange={(e) => setForm({ ...form, email_responsavel: e.target.value })} className={inputClass}/>
              </div>
            </div>
          </Secao>

          <Secao titulo="Informações de Saúde" icone="🏥">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Plano de saúde</label>
                <input type="text" placeholder="Ex: Unimed, Bradesco..." value={form.plano_saude} onChange={(e) => setForm({ ...form, plano_saude: e.target.value })} className={inputClass}/>
              </div>
              <div>
                <label className={labelClass}>Número do processo / Liminar</label>
                <input type="text" placeholder="Ex: 0000000-00.0000.0.00.0000" value={form.numero_processo} onChange={(e) => setForm({ ...form, numero_processo: e.target.value })} className={inputClass}/>
              </div>
              <div>
                <label className={labelClass}>Diagnóstico</label>
                <input type="text" placeholder="Ex: TEA, TDAH..." value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} className={inputClass}/>
              </div>
              <div>
                <label className={labelClass}>CID</label>
                <input type="text" placeholder="Ex: F84.0" value={form.cid} onChange={(e) => setForm({ ...form, cid: e.target.value })} className={inputClass}/>
              </div>
              <div>
                <label className={labelClass}>Alergias</label>
                <input type="text" placeholder="Ex: Dipirona, amendoim..." value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} className={inputClass}/>
              </div>
              <div>
                <label className={labelClass}>Medicamentos em uso</label>
                <input type="text" placeholder="Ex: Ritalina 10mg, Risperdal..." value={form.medicamentos} onChange={(e) => setForm({ ...form, medicamentos: e.target.value })} className={inputClass}/>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Observações gerais</label>
                <textarea placeholder="Informações relevantes sobre o paciente..." value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 bg-white resize-none" rows={3}/>
              </div>
            </div>
          </Secao>

          <button type="submit" disabled={isPending || uploadingFoto || !form.nome.trim()}
            className="w-full h-12 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-sm">
            {isPending || uploadingFoto ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Salvando prontuário...
              </span>
            ) : "Cadastrar Criança"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setListaAberta(!listaAberta)}
          className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition text-left border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-700 text-sm">Crianças cadastradas</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">{criancas.length}</span>
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${listaAberta ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        {listaAberta && (
          <>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <input type="text" placeholder="Buscar por nome, responsável ou escola..." value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full sm:w-72 pl-3 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"/>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-slate-400">Carregando...</p>
              </div>
            ) : criancasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-4xl">👶</span>
                <p className="text-sm text-slate-400">{busca ? "Nenhuma criança encontrada." : "Nenhuma criança cadastrada ainda."}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {criancasFiltradas.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 flex-shrink-0 rounded-full overflow-hidden border border-slate-200">
                        {c.foto_url ? (
                          <img src={c.foto_url} alt={c.nome} className="w-full h-full object-cover"/>
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${corAvatar(c.nome)}`}>{iniciais(c.nome)}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{c.nome}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {c.data_nascimento && <span className="text-xs text-slate-400">{calcularIdade(c.data_nascimento)}</span>}
                          {c.responsavel && <span className="text-xs text-slate-400">· {c.responsavel}</span>}
                          {c.escolas?.nome && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">🏫 {c.escolas.nome}</span>}
                          {c.plano_saude && <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">🏥 {c.plano_saude}</span>}
                          {c.alergias && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">⚠️ Alergia</span>}
                          {c.diagnostico && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">{c.diagnostico}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => abrirEdicao(c)}
                        className="h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-lg border border-blue-100 transition-all">
                        Editar
                      </button>
                      <button onClick={() => excluirCrianca(c.id, c.nome)}
                        className="h-9 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 rounded-lg border border-red-100 transition-all">
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!loading && criancasFiltradas.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-400">Mostrando {criancasFiltradas.length} de {criancas.length} criança{criancas.length !== 1 ? "s" : ""}</p>
              </div>
            )}
          </>
        )}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditando(null); }}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-900 px-6 py-4 flex items-center justify-between sticky top-0 rounded-t-2xl">
              <h3 className="text-white font-bold">Editar Prontuário — {editando.nome}</h3>
              <button onClick={() => setEditando(null)} className="text-blue-200 hover:text-white transition text-xl">✕</button>
            </div>

            <div className="p-6 space-y-8">
              <div className="flex items-center gap-4">
                <div onClick={() => inputFotoEditRef.current?.click()}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 transition">
                  {fotoEditPreview ? <img src={fotoEditPreview} alt="Preview" className="w-full h-full object-cover"/> : <span className="text-2xl">📷</span>}
                </div>
                <input ref={inputFotoEditRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFotoEditFile(f); setFotoEditPreview(URL.createObjectURL(f)); } }}/>
                <p className="text-xs text-slate-500">Clique para alterar a foto</p>
              </div>

              <Secao titulo="Identificação" icone="🪪">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Nome completo</label>
                    <input type="text" value={formEdit.nome || ""} onChange={(e) => setFormEdit({ ...formEdit, nome: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Data de nascimento</label>
                    <input type="date" value={formEdit.data_nascimento || ""} onChange={(e) => setFormEdit({ ...formEdit, data_nascimento: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Sexo</label>
                    <select value={formEdit.sexo || ""} onChange={(e) => setFormEdit({ ...formEdit, sexo: e.target.value })} className={inputClass}>
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>CPF</label>
                    <input type="text" value={formEdit.cpf || ""} onChange={(e) => setFormEdit({ ...formEdit, cpf: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Escola</label>
                    <select value={formEdit.escola_id || ""} onChange={(e) => setFormEdit({ ...formEdit, escola_id: e.target.value })} className={inputClass}>
                      <option value="">Sem escola</option>
                      {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                </div>
              </Secao>

              <Secao titulo="Responsável" icone="👨‍👩‍👧">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Nome do responsável</label>
                    <input type="text" value={formEdit.responsavel || ""} onChange={(e) => setFormEdit({ ...formEdit, responsavel: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Telefone / WhatsApp</label>
                    <input type="text" value={formEdit.telefone_responsavel || ""} onChange={(e) => setFormEdit({ ...formEdit, telefone_responsavel: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input type="email" value={formEdit.email_responsavel || ""} onChange={(e) => setFormEdit({ ...formEdit, email_responsavel: e.target.value })} className={inputClass}/>
                  </div>
                </div>
              </Secao>

              <Secao titulo="Informações de Saúde" icone="🏥">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Plano de saúde</label>
                    <input type="text" value={formEdit.plano_saude || ""} onChange={(e) => setFormEdit({ ...formEdit, plano_saude: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Número do processo</label>
                    <input type="text" value={formEdit.numero_processo || ""} onChange={(e) => setFormEdit({ ...formEdit, numero_processo: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Diagnóstico</label>
                    <input type="text" value={formEdit.diagnostico || ""} onChange={(e) => setFormEdit({ ...formEdit, diagnostico: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>CID</label>
                    <input type="text" value={formEdit.cid || ""} onChange={(e) => setFormEdit({ ...formEdit, cid: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Alergias</label>
                    <input type="text" value={formEdit.alergias || ""} onChange={(e) => setFormEdit({ ...formEdit, alergias: e.target.value })} className={inputClass}/>
                  </div>
                  <div>
                    <label className={labelClass}>Medicamentos em uso</label>
                    <input type="text" value={formEdit.medicamentos || ""} onChange={(e) => setFormEdit({ ...formEdit, medicamentos: e.target.value })} className={inputClass}/>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Observações</label>
                    <textarea value={formEdit.observacoes || ""} onChange={(e) => setFormEdit({ ...formEdit, observacoes: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white resize-none" rows={3}/>
                  </div>
                </div>
              </Secao>

              <div className="flex gap-3">
                <button onClick={() => setEditando(null)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button onClick={salvarEdicao} disabled={salvandoEdicao || !formEdit.nome?.trim()}
                  className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                  {salvandoEdicao ? "Salvando..." : "Salvar prontuário"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}