"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  aguardando: { label: "🔗 Link enviado", color: "bg-amber-50 text-amber-700 border-amber-200" },
  respondido: { label: "✅ Respondido", color: "bg-blue-50 text-blue-700 border-blue-200" },
  paciente: { label: "👶 Virou paciente", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  nao_seguiu: { label: "📁 Não seguiu adiante", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const CAMPOS_DETALHE: { secao: string; campos: { chave: string; label: string }[] }[] = [
  { secao: "🪪 Identificação", campos: [
    { chave: "nome_crianca", label: "Nome da criança" },
    { chave: "idade", label: "Idade" },
    { chave: "data_nascimento", label: "Data de nascimento" },
    { chave: "nome_pais", label: "Responsável(is)" },
    { chave: "endereco", label: "Endereço" },
    { chave: "telefone", label: "Telefone" },
    { chave: "email", label: "E-mail" },
    { chave: "como_soube", label: "Como soube da clínica" },
    { chave: "alergia", label: "Alergia" },
    { chave: "alergia_obs", label: "Detalhe da alergia" },
  ]},
  { secao: "🩺 Histórico Médico", campos: [
    { chave: "diagnostico", label: "Diagnóstico" },
    { chave: "gestacao", label: "Gestação" },
    { chave: "parto", label: "Parto" },
    { chave: "primeiros_meses", label: "Primeiros meses" },
    { chave: "acompanhamento_atual", label: "Acompanhamento atual" },
    { chave: "terapias_anteriores", label: "Terapias anteriores" },
  ]},
  { secao: "🏫 Escola e Comportamento", campos: [
    { chave: "queixa", label: "Queixa principal" },
    { chave: "relato_escola", label: "Comportamento na escola" },
    { chave: "aprendizado_academico", label: "Aprendizado acadêmico" },
    { chave: "leitura", label: "Leitura" },
    { chave: "motora_fina", label: "Motora fina" },
    { chave: "motora_ampla", label: "Motora ampla" },
    { chave: "atencao", label: "Atenção" },
    { chave: "habilidade_social", label: "Habilidade social" },
    { chave: "escola_nome", label: "Escola" },
    { chave: "escola_telefone", label: "Telefone da escola" },
    { chave: "escola_professora", label: "Professora" },
    { chave: "escola_local", label: "Regular/Especial" },
    { chave: "dias_semana_escola", label: "Dias por semana" },
    { chave: "horas_dia_escola", label: "Horas por dia" },
    { chave: "outros_servicos", label: "Outros serviços" },
    { chave: "contatos_outros_prestadores", label: "Contato de outros prestadores" },
  ]},
  { secao: "🏠 Casa e Comunicação", campos: [
    { chave: "pessoas_casa", label: "Quem mora com a criança" },
    { chave: "pais_separados", label: "Pais separados" },
    { chave: "guarda", label: "Guarda" },
    { chave: "frequencia_outro_pai", label: "Frequência com o outro" },
    { chave: "qtd_amigos", label: "Qtd. amigos próximos" },
    { chave: "horas_amigos_fora_escola", label: "Horas com amigos fora da escola" },
    { chave: "atividade_extracurricular", label: "Atividade extracurricular" },
    { chave: "como_comunica", label: "Como se comunica" },
    { chave: "facilidade_comunicacao", label: "Facilidade de comunicação" },
    { chave: "necessidade_sensorial", label: "Necessidade sensorial" },
    { chave: "brinca_independente", label: "Brinca independente" },
    { chave: "comportamento_social_adequado", label: "Comportamento social" },
  ]},
  { secao: "🧩 Habilidades", campos: [
    { chave: "capaz_brincar_fisicamente", label: "Brincar fisicamente" },
    { chave: "capaz_atividades_dia_a_dia", label: "Atividades do dia a dia" },
    { chave: "usa_banheiro_sozinho", label: "Usa banheiro sozinho" },
    { chave: "habilidade_comer", label: "Habilidade de comer" },
    { chave: "habilidades_seguranca", label: "Noção de segurança" },
    { chave: "problemas_comportamento", label: "Problemas de comportamento" },
    { chave: "duracao_comportamento", label: "Duração do comportamento" },
    { chave: "pontos_fortes", label: "Pontos fortes" },
    { chave: "pontos_fracos", label: "Pontos fracos" },
  ]},
  { secao: "🎯 Objetivos", campos: [
    { chave: "objetivos_aba", label: "Objetivos com a Terapia ABA" },
    { chave: "reforcadores", label: "Reforçadores / preferências" },
    { chave: "rotina_sono", label: "Rotina e sono" },
    { chave: "disponibilidade_familia", label: "Disponibilidade da família" },
    { chave: "responsavel_preencheu", label: "Preenchido por" },
  ]},
];

// Campos que a Simone formaliza ao marcar a entrevista inicial (não vêm do
// link da família) — ficam editáveis a qualquer momento no detalhe, pois
// muitas vezes só se completam depois (ex: convênio confirmado num retorno).
const CAMPOS_LIGACAO: { chave: string; label: string; tipo: "date" | "text"; placeholder?: string }[] = [
  { chave: "agendamento_data", label: "Data da entrevista/consulta", tipo: "date" },
  { chave: "agendamento_horario", label: "Horário", tipo: "text", placeholder: "Ex: 14h" },
  { chave: "cid", label: "CID", tipo: "text" },
  { chave: "medico_nome", label: "Médico", tipo: "text" },
  { chave: "medico_crm", label: "CRM", tipo: "text" },
  { chave: "convenio_nome", label: "Nome do convênio", tipo: "text" },
  { chave: "convenio_titular", label: "Titular do convênio", tipo: "text" },
  { chave: "convenio_cpf", label: "CPF do titular", tipo: "text" },
  { chave: "convenio_contato", label: "Contato do convênio", tipo: "text" },
  { chave: "convenio_setor", label: "Setor", tipo: "text" },
  { chave: "convenio_endereco", label: "Endereço do convênio", tipo: "text" },
];
const CAMPOS_LIGACAO_VAZIO = Object.fromEntries(CAMPOS_LIGACAO.map(c => [c.chave, ""]));

export default function EntrevistaInicialPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarioNome, setUsuarioNome] = useState("");
  const [usuarioEmail, setUsuarioEmail] = useState("");

  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [criando, setCriando] = useState(false);
  const [linkGerado, setLinkGerado] = useState("");
  const [copiado, setCopiado] = useState(false);

  const [selecionada, setSelecionada] = useState<any | null>(null);
  const [obsRascunho, setObsRascunho] = useState("");
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [dadosLigacao, setDadosLigacao] = useState<Record<string, string>>(CAMPOS_LIGACAO_VAZIO);
  const [salvandoLigacao, setSalvandoLigacao] = useState(false);
  const [ligacaoSalva, setLigacaoSalva] = useState(false);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from("entrevistas_iniciais").select("*").order("created_at", { ascending: false });
    setLista(data || []);
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUsuarioEmail(user.email);
        const { data: a } = await supabase.from("atendentes").select("nome").eq("email", user.email).maybeSingle();
        if (a?.nome) setUsuarioNome(a.nome);
      }
      carregar();
    }
    init();
  }, []);

  async function gerarLink(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim() || !novoTelefone.trim()) return;
    setCriando(true);
    const { data, error } = await supabase.from("entrevistas_iniciais").insert([{
      nome_crianca_preenchido: novoNome.trim(),
      contato_telefone: novoTelefone.trim(),
      contato_email: novoEmail.trim() || null,
      criado_por_email: usuarioEmail,
      criado_por_nome: usuarioNome,
    }]).select("token").single();
    setCriando(false);
    if (error || !data) return;
    setLinkGerado(`${window.location.origin}/entrevista-inicial/${data.token}`);
    carregar();
  }

  function fecharNovo() {
    setMostrarNovo(false);
    setNovoNome(""); setNovoTelefone(""); setNovoEmail(""); setLinkGerado(""); setCopiado(false);
  }

  function copiarLink(link: string) {
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function criarCriancaAPartirDaEntrevista(item: any): Promise<string | null> {
    const alergias = [item.alergia, item.alergia_obs].filter(Boolean).join(" — ") || null;
    const idadeNum = item.idade ? parseInt(item.idade, 10) : NaN;
    const { data, error } = await supabase.from("criancas").insert([{
      nome: item.nome_crianca || item.nome_crianca_preenchido,
      data_nascimento: item.data_nascimento || null,
      idade: Number.isFinite(idadeNum) ? idadeNum : null,
      responsavel: item.nome_pais || null,
      telefone_responsavel: item.telefone || item.contato_telefone || null,
      email_responsavel: item.email || item.contato_email || null,
      diagnostico: item.diagnostico || null,
      cid: item.cid || null,
      plano_saude: item.convenio_nome || null,
      alergias,
      medicamentos: item.medicacoes_texto || null,
      ativo: true,
    }]).select("id").single();
    if (error || !data) return null;
    return data.id;
  }

  async function mudarStatus(id: string, status: string) {
    setSalvandoStatus(true);
    const payload: Record<string, string | null> = { status, observacoes_simone: obsRascunho };

    let criancaId: string | null = selecionada?.crianca_id || null;
    if (status === "paciente" && selecionada && !criancaId) {
      criancaId = await criarCriancaAPartirDaEntrevista(selecionada);
      if (criancaId) payload.crianca_id = criancaId;
    }

    await supabase.from("entrevistas_iniciais").update(payload).eq("id", id);
    setSalvandoStatus(false);
    setSelecionada(null);
    carregar();
    if (status === "paciente" && criancaId) router.push(`/gestao/criancas/${criancaId}`);
  }

  async function excluirEntrevista(id: string, nome: string) {
    if (!confirm(`Excluir o registro de "${nome}"? Essa ação não pode ser desfeita.`)) return;
    await supabase.from("entrevistas_iniciais").delete().eq("id", id);
    setSelecionada(null);
    carregar();
  }

  function extrairLigacao(item: any): Record<string, string> {
    const out: Record<string, string> = {};
    for (const c of CAMPOS_LIGACAO) out[c.chave] = item[c.chave] || "";
    return out;
  }

  async function abrir(item: any) {
    // Busca fresca ao abrir — se a família respondeu depois que essa lista
    // carregou (ex: aba ficou aberta enquanto testava o link), o item em
    // memória ainda mostraria "aguardando" mesmo já tendo sido respondido.
    setSelecionada(item);
    setObsRascunho(item.observacoes_simone || "");
    setDadosLigacao(extrairLigacao(item));
    const { data } = await supabase.from("entrevistas_iniciais").select("*").eq("id", item.id).maybeSingle();
    if (data) {
      setSelecionada(data);
      setObsRascunho(data.observacoes_simone || "");
      setDadosLigacao(extrairLigacao(data));
      if (data.status !== item.status) carregar(); // atualiza o selo na lista também
    }
  }

  async function salvarLigacao() {
    if (!selecionada) return;
    setSalvandoLigacao(true);
    const payload: Record<string, string | null> = {};
    for (const c of CAMPOS_LIGACAO) {
      const v = dadosLigacao[c.chave]?.trim() || "";
      payload[c.chave] = v === "" ? null : v;
    }
    await supabase.from("entrevistas_iniciais").update(payload).eq("id", selecionada.id);
    setSalvandoLigacao(false);
    setLigacaoSalva(true);
    setTimeout(() => setLigacaoSalva(false), 2000);
    carregar();
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Entrevista Inicial</h1>
          <p className="text-xs text-slate-400 mt-0.5">Famílias que procuraram a clínica — gere um link pra elas preencherem sozinhas</p>
        </div>
        <button onClick={() => setMostrarNovo(true)}
          className="h-10 px-5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition active:scale-95 shrink-0">
          + Gerar Link
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">📋</span>
          <p className="text-sm text-slate-400">Nenhuma entrevista gerada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(item => {
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.aguardando;
            return (
              <button key={item.id} onClick={() => abrir(item)}
                className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{item.nome_crianca || item.nome_crianca_preenchido}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.contato_telefone} · {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${cfg.color}`}>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MODAL NOVO LINK */}
      {mostrarNovo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) fecharNovo(); }}>
          <div className="w-full sm:max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">Gerar link de Entrevista</h3>
              <button onClick={fecharNovo} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">✕</button>
            </div>

            {!linkGerado ? (
              <form onSubmit={gerarLink} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome da criança *</label>
                  <input required value={novoNome} onChange={e => setNovoNome(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Telefone de contato *</label>
                  <input required value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">E-mail (opcional)</label>
                  <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <button type="submit" disabled={criando}
                  className="w-full h-11 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50">
                  {criando ? "Gerando..." : "Gerar link"}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Link gerado! Copie e mande pra família por WhatsApp:</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 break-all">{linkGerado}</div>
                <button onClick={() => copiarLink(linkGerado)}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition">
                  {copiado ? "✓ Copiado!" : "📋 Copiar link"}
                </button>
                <button onClick={fecharNovo} className="w-full h-10 text-slate-500 text-sm font-medium">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DETALHE */}
      {selecionada && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setSelecionada(null); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-base">{selecionada.nome_crianca || selecionada.nome_crianca_preenchido}</h3>
              <button onClick={() => setSelecionada(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">✕</button>
            </div>

            <div className="space-y-3 pb-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">📅 Agendamento e Convênio</p>
              <p className="text-xs text-slate-400 -mt-2">Preenchido por você durante ou depois da entrevista inicial com a família — pode completar ou atualizar quando quiser.</p>
              {CAMPOS_LIGACAO.map(c => (
                <div key={c.chave} className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</label>
                  <input type={c.tipo} placeholder={c.placeholder} value={dadosLigacao[c.chave]}
                    onChange={e => setDadosLigacao(prev => ({ ...prev, [c.chave]: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <button onClick={salvarLigacao} disabled={salvandoLigacao}
                className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                {salvandoLigacao ? "Salvando..." : ligacaoSalva ? "✓ Salvo!" : "Salvar agendamento e convênio"}
              </button>
            </div>

            {selecionada.status === "aguardando" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Ainda não respondida. Link pra reenviar se precisar:</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 break-all">
                  {typeof window !== "undefined" ? `${window.location.origin}/entrevista-inicial/${selecionada.token}` : ""}
                </div>
                <button onClick={() => copiarLink(`${window.location.origin}/entrevista-inicial/${selecionada.token}`)}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition">
                  {copiado ? "✓ Copiado!" : "📋 Copiar link"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {CAMPOS_DETALHE.map(sec => {
                  const preenchidos = sec.campos.filter(c => selecionada[c.chave]);
                  if (preenchidos.length === 0) return null;
                  return (
                    <div key={sec.secao} className="space-y-1.5 pt-2 border-t border-slate-100 first:border-t-0 first:pt-0">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{sec.secao}</p>
                      {preenchidos.map(c => (
                        <p key={c.chave} className="text-sm text-slate-700"><span className="font-medium text-slate-500">{c.label}:</span> {String(selecionada[c.chave])}</p>
                      ))}
                    </div>
                  );
                })}

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sua anotação (interna)</label>
                  <textarea rows={2} value={obsRascunho} onChange={e => setObsRascunho(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button onClick={() => mudarStatus(selecionada.id, "paciente")} disabled={salvandoStatus}
                    className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                    👶 Virou paciente
                  </button>
                  <button onClick={() => mudarStatus(selecionada.id, "nao_seguiu")} disabled={salvandoStatus}
                    className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition disabled:opacity-50">
                    📁 Não seguiu adiante
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => excluirEntrevista(selecionada.id, selecionada.nome_crianca || selecionada.nome_crianca_preenchido)}
              className="w-full text-center text-xs text-slate-400 hover:text-red-600 transition pt-2">
              🗑️ Excluir este registro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
