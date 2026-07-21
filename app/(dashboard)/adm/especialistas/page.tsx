"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";

export default function EspecialistasPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [listaAberta, setListaAberta] = useState(true);
  const [editando, setEditando] = useState<any | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [registro, setRegistro] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [dataDemissao, setDataDemissao] = useState("");
  const [motivoSaida, setMotivoSaida] = useState("");

  const MOTIVOS_SAIDA = [
    "Pedido de demissão", "Demissão sem justa causa",
    "Demissão por justa causa", "Término de contrato", "Abandono de emprego",
  ];

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  function mascaraCpf(valor: string): string {
    return valor
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function cpfValido(cpf: string): boolean {
    const n = cpf.replace(/\D/g, "");
    if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(n[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto >= 10) resto = 0;
    if (resto !== parseInt(n[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(n[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto >= 10) resto = 0;
    return resto === parseInt(n[10]);
  }

  async function getUsuarioLogado() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  const carregarEspecialistas = async () => {
    setLoadingLista(true);
    const { data } = await supabase.from("atendentes").select("*").eq("role", "especialista").order("nome");
    setEspecialistas(data || []);
    setLoadingLista(false);
  };

  useEffect(() => { carregarEspecialistas(); }, [supabase]);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf && !cpfValido(cpf)) {
      mostrarFeedback("erro", "CPF inválido. Verifique o número informado.");
      return;
    }
    setLoading(true);
    const { data: novo, error } = await supabase.from("atendentes").insert([{
      nome, email, whatsapp, especialidade,
      registro_profissional: registro,
      cpf, rg,
      data_nascimento: dataNascimento || null,
      endereco,
      cnpj: cnpj || null,
      razao_social: razaoSocial || null,
      data_demissao: dataDemissao || null,
      motivo_saida: motivoSaida || null,
      role: "especialista",
    }]).select().single();

    if (error) {
      mostrarFeedback("erro", "Erro ao cadastrar: " + error.message);
    } else {
      const user = await getUsuarioLogado();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Criou",
        tabela: "atendentes",
        registro_id: novo?.id,
        descricao: `Cadastrou o especialista: ${nome}`,
      });
      mostrarFeedback("sucesso", "Especialista cadastrado com sucesso!");
      setNome(""); setEmail(""); setWhatsapp(""); setEspecialidade("");
      setRegistro(""); setCpf(""); setRg(""); setDataNascimento(""); setEndereco("");
      carregarEspecialistas();
    }
    setLoading(false);
  };

  async function salvarEdicao() {
    if (!editando) return;
    if (editando.cpf && !cpfValido(editando.cpf)) {
      mostrarFeedback("erro", "CPF inválido. Verifique o número informado.");
      return;
    }
    setSalvandoEdicao(true);
    const { error } = await supabase.from("atendentes").update({
      nome: editando.nome,
      email: editando.email,
      whatsapp: editando.whatsapp,
      especialidade: editando.especialidade,
      registro_profissional: editando.registro_profissional,
      cpf: editando.cpf,
      rg: editando.rg,
      data_nascimento: editando.data_nascimento || null,
      endereco: editando.endereco,
    }).eq("id", editando.id);

    if (!error) {
      const user = await getUsuarioLogado();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Editou",
        tabela: "atendentes",
        registro_id: editando.id,
        descricao: `Editou o especialista: ${editando.nome}`,
      });
    }

    setSalvandoEdicao(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao editar: " + error.message);
    } else {
      setEditando(null);
      carregarEspecialistas();
      mostrarFeedback("sucesso", "Especialista atualizado com sucesso!");
    }
  }

  async function excluir(id: string, nomeEsp: string) {
    if (!confirm(`Remover "${nomeEsp}"?`)) return;
    const { error } = await supabase.from("atendentes").delete().eq("id", id);
    if (!error) {
      const user = await getUsuarioLogado();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: "atendentes",
        registro_id: id,
        descricao: `Removeu o especialista: ${nomeEsp}`,
      });
    }
    if (error) {
      mostrarFeedback("erro", "Erro ao excluir: " + error.message);
    } else {
      carregarEspecialistas();
      mostrarFeedback("sucesso", "Especialista removido.");
    }
  }

  const filtrados = especialistas.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (e.especialidade || "").toLowerCase().includes(busca.toLowerCase())
  );

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const coresAvatar = [
    "bg-purple-100 text-purple-700", "bg-blue-100 text-blue-700",
    "bg-teal-100 text-teal-700", "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  ];

  function corAvatar(nome: string) {
    return coresAvatar[nome.charCodeAt(0) % coresAvatar.length];
  }

  const inputClass = "w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 transition";

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Especialistas</h1>
          <p className="text-xs text-slate-400 mt-0.5">Cadastre e gerencie os especialistas da clínica.</p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
          {especialistas.length} especialistas
        </span>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800">Novo Especialista</h2>
          <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-medium">Cadastro rapido</span>
        </div>
        <form onSubmit={handleCadastrar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome completo *</label>
              <input type="text" required placeholder="Ex: Dra. Ana Paula Silva" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail *</label>
              <input type="email" required placeholder="Ex: ana@clinica.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CPF</label>
              <input type="text" placeholder="Ex: 000.000.000-00" value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">RG</label>
              <input type="text" placeholder="Ex: 00.000.000-00" value={rg} onChange={(e) => setRg(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data de Nascimento</label>
              <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data de Demissão</label>
              <input type="date" value={dataDemissao} onChange={(e) => setDataDemissao(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Motivo de Saída</label>
            <select value={motivoSaida} onChange={(e) => setMotivoSaida(e.target.value)} className={inputClass}>
              <option value="">— Selecione —</option>
              {MOTIVOS_SAIDA.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp / Telefone</label>
              <input type="text" placeholder="Ex: (71) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Area de Atuacao *</label>
              <input type="text" required placeholder="Ex: Psicologia, Fonoaudiologia..." value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Registro (CRP/CRM/CREFONO)</label>
              <input type="text" placeholder="Ex: CRP 03/12345" value={registro} onChange={(e) => setRegistro(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Endereco</label>
            <input type="text" placeholder="Ex: Rua das Flores, 123 - Bairro - Salvador/BA" value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CNPJ</label>
              <input type="text" placeholder="00.000.000/0001-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Razão Social</label>
              <input type="text" placeholder="Nome da empresa (MEI, etc.)" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} className={inputClass} />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-sm">
            {loading ? "Cadastrando..." : "Cadastrar Especialista"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setListaAberta(!listaAberta)}
          className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition text-left border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-700 text-sm">Lista de Especialistas</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">{especialistas.length}</span>
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${listaAberta ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {listaAberta && (
          <>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <input type="text" placeholder="Buscar por nome ou area..." value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full sm:w-60 pl-3 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 transition" />
            </div>
            {loadingLista ? (
              <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-400">Carregando...</p></div>
            ) : filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-4xl">🩺</span>
                <p className="text-sm text-slate-400 font-medium">{busca ? "Nenhum especialista encontrado." : "Nenhum especialista cadastrado ainda."}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtrados.map((esp) => (
                  <li key={esp.id} className="px-5 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(esp.nome)}`}>
                          {iniciais(esp.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{esp.nome}</p>
                          <p className="text-xs text-slate-500 truncate">{esp.email}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {esp.especialidade && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">{esp.especialidade}</span>}
                            {esp.registro_profissional && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{esp.registro_profissional}</span>}
                            {esp.cpf && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">CPF: {esp.cpf}</span>}
                            {esp.data_nascimento && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Nasc: {new Date(esp.data_nascimento).toLocaleDateString("pt-BR")}</span>}
                            {esp.whatsapp && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{esp.whatsapp}</span>}
                          </div>
                          {esp.endereco && <p className="text-xs text-slate-400 mt-1 truncate">📍 {esp.endereco}</p>}
                          {esp.cnpj && <p className="text-xs text-slate-400 mt-1">🏢 CNPJ: {esp.cnpj}</p>}
                          {esp.razao_social && <p className="text-xs text-slate-400 truncate">📋 {esp.razao_social}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setEditando({ ...esp })}
                          className="h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-lg border border-blue-100 transition-all">
                          Editar
                        </button>
                        <button onClick={() => excluir(esp.id, esp.nome)}
                          className="h-9 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 rounded-lg border border-red-100 transition-all">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!loadingLista && filtrados.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-400">Mostrando {filtrados.length} de {especialistas.length} especialista{especialistas.length !== 1 ? "s" : ""}</p>
              </div>
            )}
          </>
        )}
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setEditando(null); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">Editar Especialista</h3>
              <button onClick={() => setEditando(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition">✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome</label>
                  <input type="text" value={editando.nome} autoFocus onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp</label>
                  <input type="text" value={editando.whatsapp || ""} onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail</label>
                <input type="email" value={editando.email || ""} onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CPF</label>
                  <input type="text" value={editando.cpf || ""} onChange={(e) => setEditando({ ...editando, cpf: mascaraCpf(e.target.value) })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">RG</label>
                  <input type="text" value={editando.rg || ""} onChange={(e) => setEditando({ ...editando, rg: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data Nascimento</label>
                  <input type="date" value={editando.data_nascimento || ""} onChange={(e) => setEditando({ ...editando, data_nascimento: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Area de Atuacao</label>
                  <input type="text" value={editando.especialidade || ""} onChange={(e) => setEditando({ ...editando, especialidade: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Registro Profissional</label>
                <input type="text" value={editando.registro_profissional || ""} onChange={(e) => setEditando({ ...editando, registro_profissional: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Endereco</label>
                <input type="text" value={editando.endereco || ""} onChange={(e) => setEditando({ ...editando, endereco: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition" />
              </div>
            </div>
            {feedback && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
                ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
                {feedback.msg}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition">
                Cancelar
              </button>
              <button onClick={salvarEdicao} disabled={salvandoEdicao || !editando.nome?.trim()}
                className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold active:scale-95 transition disabled:opacity-50">
                {salvandoEdicao ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}