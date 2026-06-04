"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";

export default function CadastrarAtendentePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const [atendentes, setAtendentes] = useState<any[]>([]);
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

  const carregarAtendentes = async () => {
    setLoadingLista(true);
    const { data } = await supabase.from("atendentes").select("*").eq("role", "atendente").order("nome");
    setAtendentes(data || []);
    setLoadingLista(false);
  };

  useEffect(() => { carregarAtendentes(); }, [supabase]);

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
      role: "atendente",
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
        descricao: `Cadastrou o acompanhante: ${nome}`,
      });
      mostrarFeedback("sucesso", "Acompanhante cadastrado com sucesso!");
      setNome(""); setEmail(""); setWhatsapp(""); setEspecialidade("");
      setRegistro(""); setCpf(""); setRg(""); setDataNascimento(""); setEndereco("");
      carregarAtendentes();
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
        descricao: `Editou o acompanhante: ${editando.nome}`,
      });
    }

    setSalvandoEdicao(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao editar: " + error.message);
    } else {
      setEditando(null);
      carregarAtendentes();
      mostrarFeedback("sucesso", "Acompanhante atualizado com sucesso!");
    }
  }

  async function excluirAtendente(id: string, nomeAt: string) {
    if (!confirm(`Remover "${nomeAt}" da lista?`)) return;
    const { error } = await supabase.from("atendentes").delete().eq("id", id);
    if (!error) {
      const user = await getUsuarioLogado();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: "atendentes",
        registro_id: id,
        descricao: `Removeu o acompanhante: ${nomeAt}`,
      });
    }
    if (error) {
      mostrarFeedback("erro", "Erro ao excluir: " + error.message);
    } else {
      carregarAtendentes();
      mostrarFeedback("sucesso", "Acompanhante removido.");
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
    "bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  ];

  function corAvatar(nome: string) {
    return coresAvatar[nome.charCodeAt(0) % coresAvatar.length];
  }

  const inputClass = "w-full h-12 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 transition";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 tracking-tight">Gestão de Acompanhantes</h1>
          <p className="text-slate-500 text-sm mt-1">Cadastre e gerencie os Acompanhantes Terapeuticos da clinica.</p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          {atendentes.length} profissionais
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
          <h2 className="text-base font-semibold text-slate-800">Novo Acompanhante Terapeutico</h2>
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium">Cadastro rapido</span>
        </div>
        <form onSubmit={handleCadastrar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome completo *</label>
              <input type="text" required placeholder="Ex: Ana Paula Silva" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
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
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp</label>
              <input type="text" placeholder="Ex: (71) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Especialidade</label>
              <input type="text" placeholder="Ex: Pedagoga" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Registro Profissional</label>
              <input type="text" placeholder="Ex: CRP 06/123456" value={registro} onChange={(e) => setRegistro(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Endereco</label>
            <input type="text" placeholder="Ex: Rua das Flores, 123 - Bairro - Salvador/BA" value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 shadow-sm">
            {loading ? "Cadastrando..." : "Cadastrar Acompanhante"}
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setListaAberta(!listaAberta)}
          className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition text-left border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-700 text-sm">Lista de Acompanhantes Terapeuticos</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">{atendentes.length}</span>
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${listaAberta ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {listaAberta && (
          <>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <input type="text" placeholder="Buscar por nome ou especialidade..." value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full sm:w-60 pl-3 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 transition" />
            </div>
            {loadingLista ? (
              <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-400">Carregando...</p></div>
            ) : atendenteFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-4xl">👩‍⚕️</span>
                <p className="text-sm text-slate-400 font-medium">{busca ? "Nenhum acompanhante encontrado." : "Nenhum acompanhante cadastrado ainda."}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {atendenteFiltrados.map((at) => (
                  <li key={at.id} className="px-5 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(at.nome)}`}>
                          {iniciais(at.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{at.nome}</p>
                          <p className="text-xs text-slate-500 truncate">{at.email}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {at.especialidade && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{at.especialidade}</span>}
                            {at.cpf && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">CPF: {at.cpf}</span>}
                            {at.data_nascimento && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Nasc: {new Date(at.data_nascimento).toLocaleDateString("pt-BR")}</span>}
                            {at.whatsapp && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{at.whatsapp}</span>}
                          </div>
                          {at.endereco && <p className="text-xs text-slate-400 mt-1 truncate">📍 {at.endereco}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setEditando({ ...at })}
                          className="h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 rounded-lg border border-blue-100 transition-all">
                          Editar
                        </button>
                        <button onClick={() => excluirAtendente(at.id, at.nome)}
                          className="h-9 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 rounded-lg border border-red-100 transition-all">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!loadingLista && atendenteFiltrados.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-400">Mostrando {atendenteFiltrados.length} de {atendentes.length} acompanhante{atendentes.length !== 1 ? "s" : ""}</p>
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
              <h3 className="font-semibold text-slate-800 text-base">Editar Acompanhante</h3>
              <button onClick={() => setEditando(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition">✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome</label>
                  <input type="text" value={editando.nome} autoFocus onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WhatsApp</label>
                  <input type="text" value={editando.whatsapp || ""} onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CPF</label>
                  <input type="text" value={editando.cpf || ""} onChange={(e) => setEditando({ ...editando, cpf: mascaraCpf(e.target.value) })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">RG</label>
                  <input type="text" value={editando.rg || ""} onChange={(e) => setEditando({ ...editando, rg: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data Nascimento</label>
                  <input type="date" value={editando.data_nascimento || ""} onChange={(e) => setEditando({ ...editando, data_nascimento: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Especialidade</label>
                  <input type="text" value={editando.especialidade || ""} onChange={(e) => setEditando({ ...editando, especialidade: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Registro Profissional</label>
                <input type="text" value={editando.registro_profissional || ""} onChange={(e) => setEditando({ ...editando, registro_profissional: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Endereco</label>
                <input type="text" value={editando.endereco || ""} onChange={(e) => setEditando({ ...editando, endereco: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditando(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition">
                Cancelar
              </button>
              <button onClick={salvarEdicao} disabled={salvandoEdicao || !editando.nome?.trim()}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold active:scale-95 transition disabled:opacity-50">
                {salvandoEdicao ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}