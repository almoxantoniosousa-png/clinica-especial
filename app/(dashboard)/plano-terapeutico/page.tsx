"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { Plus, X, Trash2, ClipboardList } from "lucide-react";

type Crianca = { id: string; nome: string; foto_url?: string | null };

type ComportamentoAlvo = { comportamento: string; definicao: string };

type Plano = {
  id: string;
  crianca_id: string;
  data_reuniao: string;
  local_contexto: string | null;
  participantes: string[];
  comportamentos_alvo: ComportamentoAlvo[];
  estrategias_gerais: string | null;
  proxima_revisao: string | null;
  criado_por_nome: string | null;
  ativo: boolean;
  created_at: string;
  criancas?: { nome: string; foto_url?: string | null };
};

export default function PlanoTerapeuticoPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [role, setRole] = useState("");
  const [nome, setNome] = useState("");
  const [userId, setUserId] = useState("");
  const [carregandoAcesso, setCarregandoAcesso] = useState(true);
  const [acessoLiberado, setAcessoLiberado] = useState(true);

  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"lista" | "form">("lista");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Campos do formulário
  const [criancaId, setCriancaId] = useState("");
  const [dataReuniao, setDataReuniao] = useState(() => new Date().toISOString().slice(0, 10));
  const [localContexto, setLocalContexto] = useState("");
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [novoParticipante, setNovoParticipante] = useState("");
  const [comportamentos, setComportamentos] = useState<ComportamentoAlvo[]>([]);
  const [estrategiasGerais, setEstrategiasGerais] = useState("");
  const [proximaRevisao, setProximaRevisao] = useState("");

  const podeEditar = role === "gestao" || role === "supervisora";

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setCarregandoAcesso(false); return; }
      const { data: u } = await supabase.from("usuarios").select("id, nome, role").eq("email", user.email).maybeSingle();
      const r = (u?.role || "").toString().trim().toLowerCase();
      setRole(r);
      setNome(u?.nome || "");
      setUserId(u?.id || "");
      setAcessoLiberado(r === "gestao" || r === "supervisora" || r === "especialista");
      setCarregandoAcesso(false);

      const { data: cr } = await supabase.from("criancas").select("id, nome, foto_url").eq("ativo", true).order("nome");
      setCriancas(cr || []);
    })();
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("planos_terapeuticos")
      .select("*, criancas(nome, foto_url)")
      .order("data_reuniao", { ascending: false });
    if (!error) setPlanos((data ?? []) as unknown as Plano[]);
    setLoading(false);
  }

  function abrirNovo() {
    setEditandoId(null);
    setCriancaId("");
    setDataReuniao(new Date().toISOString().slice(0, 10));
    setLocalContexto("");
    setParticipantes(nome ? [nome] : []);
    setNovoParticipante("");
    setComportamentos([]);
    setEstrategiasGerais("");
    setProximaRevisao("");
    setErro("");
    setView("form");
  }

  function abrirEdicao(p: Plano) {
    setEditandoId(p.id);
    setCriancaId(p.crianca_id);
    setDataReuniao(p.data_reuniao);
    setLocalContexto(p.local_contexto || "");
    setParticipantes(p.participantes || []);
    setNovoParticipante("");
    setComportamentos(p.comportamentos_alvo || []);
    setEstrategiasGerais(p.estrategias_gerais || "");
    setProximaRevisao(p.proxima_revisao || "");
    setErro("");
    setView("form");
  }

  function adicionarParticipante() {
    const v = novoParticipante.trim();
    if (!v) return;
    setParticipantes((prev) => [...prev, v]);
    setNovoParticipante("");
  }

  function adicionarComportamento() {
    setComportamentos((prev) => [...prev, { comportamento: "", definicao: "" }]);
  }

  function atualizarComportamento(idx: number, patch: Partial<ComportamentoAlvo>) {
    setComportamentos((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function removerComportamento(idx: number) {
    setComportamentos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function salvar() {
    if (!criancaId) { setErro("Selecione a criança."); return; }
    if (!dataReuniao) { setErro("Informe a data da reunião."); return; }
    setSalvando(true);
    setErro("");

    const nomeCrianca = criancas.find((c) => c.id === criancaId)?.nome || "Criança";
    const payload = {
      crianca_id: criancaId,
      data_reuniao: dataReuniao,
      local_contexto: localContexto || null,
      participantes,
      comportamentos_alvo: comportamentos.filter((c) => c.comportamento.trim()),
      estrategias_gerais: estrategiasGerais || null,
      proxima_revisao: proximaRevisao || null,
    };

    const { error } = editandoId
      ? await supabase.from("planos_terapeuticos").update(payload).eq("id", editandoId)
      : await supabase.from("planos_terapeuticos").insert([{ ...payload, criado_por_nome: nome || null, criado_por_id: userId || null }]);

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    await registrarLog(supabase, {
      usuario_email: nome, usuario_nome: nome,
      acao: editandoId ? "Editou Plano Terapêutico" : "Criou Plano Terapêutico",
      tabela: "planos_terapeuticos",
      descricao: `${nomeCrianca} — reunião de ${new Date(dataReuniao + "T12:00:00").toLocaleDateString("pt-BR")}`,
    });

    setView("lista");
    carregar();
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition bg-white";
  const labelClass = "text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block";

  if (carregandoAcesso) {
    return <div className="text-center py-20 text-slate-400 text-sm">Carregando...</div>;
  }

  if (!acessoLiberado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
          <span className="text-4xl">🔒</span>
          <h1 className="font-bold text-slate-800">Acesso restrito</h1>
          <p className="text-sm text-slate-500">Esta tela é só para Gestão, Supervisora e Especialista.</p>
        </div>
      </div>
    );
  }

  // =============================================
  // VIEW: FORM (só Gestão/Supervisora)
  // =============================================
  if (view === "form" && podeEditar) {
    return (
      <div className="space-y-5 pb-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{editandoId ? "Editar Plano Terapêutico" : "Novo Plano Terapêutico"}</h1>
          <p className="text-xs text-slate-400 mt-0.5">Definido em reunião — Gestão + Supervisão (Especialistas participam da reunião)</p>
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Criança</label>
              <select value={criancaId} onChange={(e) => setCriancaId(e.target.value)} className={inputClass} disabled={!!editandoId}>
                <option value="">Selecione...</option>
                {criancas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Data da reunião</label>
              <input type="date" value={dataReuniao} onChange={(e) => setDataReuniao(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Contexto / local principal</label>
            <input type="text" value={localContexto} onChange={(e) => setLocalContexto(e.target.value)}
              placeholder="Ex: Sala de aula — Suporte 1" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Participantes da reunião</label>
            {participantes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {participantes.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 pl-2.5 pr-1.5 py-1 rounded-full">
                    {p}
                    <button onClick={() => setParticipantes((prev) => prev.filter((_, j) => j !== i))}
                      className="w-3.5 h-3.5 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={novoParticipante} onChange={(e) => setNovoParticipante(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarParticipante(); } }}
                placeholder="Nome de quem participou..." className={inputClass} />
              <button onClick={adicionarParticipante} type="button"
                className="px-4 rounded-xl border-2 border-dashed border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition shrink-0">
                + Adicionar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
          <div>
            <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">🎯 Comportamentos-alvo</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Baseie-se no histórico de Registros ABC dessa criança pra definir os comportamentos aqui.</p>
          </div>

          {comportamentos.map((c, idx) => (
            <div key={idx} className="border-2 border-red-100 bg-red-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-700 text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</div>
                <input type="text" value={c.comportamento} onChange={(e) => atualizarComportamento(idx, { comportamento: e.target.value })}
                  placeholder="Nome do comportamento-alvo" className="flex-1 bg-transparent text-sm font-bold text-red-800 focus:outline-none placeholder:font-normal placeholder:text-slate-400" />
                <button onClick={() => removerComportamento(idx)} className="text-slate-400 hover:text-red-700 transition shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea rows={2} value={c.definicao} onChange={(e) => atualizarComportamento(idx, { definicao: e.target.value })}
                placeholder="Definição operacional / o que conta como esse comportamento..."
                className="w-full px-3 py-2 rounded-lg border border-red-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            </div>
          ))}

          <button onClick={adicionarComportamento} type="button"
            className="w-full py-3 rounded-xl border-2 border-dashed border-red-200 text-red-700 text-xs font-bold hover:bg-red-50 transition">
            + Adicionar comportamento-alvo
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className={labelClass}>Estratégias gerais recomendadas</label>
            <textarea rows={3} value={estrategiasGerais} onChange={(e) => setEstrategiasGerais(e.target.value)}
              placeholder="Ex: antecipar transições verbalmente, priorizar reforço positivo..." className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Próxima revisão prevista (opcional)</label>
            <input type="date" value={proximaRevisao} onChange={(e) => setProximaRevisao(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => setView("lista")}
            className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || !criancaId}
            className="h-11 px-5 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">
            {salvando ? "Salvando..." : "Salvar plano"}
          </button>
        </div>
      </div>
    );
  }

  // =============================================
  // VIEW: LISTA
  // =============================================
  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📋 Planos Terapêuticos</h1>
          <p className="text-xs text-slate-400 mt-0.5">Definidos em reunião — Gestão + Supervisão</p>
        </div>
        {podeEditar && (
          <button onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors self-start">
            <Plus className="h-4 w-4" /> Novo plano
          </button>
        )}
      </div>

      {!podeEditar && (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">Você está vendo em modo de visualização — só Gestão e Supervisora criam ou editam planos.</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : planos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <ClipboardList className="h-10 w-10 mx-auto text-slate-300" />
          <p className="text-sm text-slate-400 mt-2">Nenhum plano terapêutico registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {planos.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {p.criancas?.foto_url
                      ? <img src={p.criancas.foto_url} alt="" className="w-full h-full object-cover" />
                      : (p.criancas?.nome?.charAt(0) || "?")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.criancas?.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Reunião de {new Date(p.data_reuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                      {p.local_contexto ? ` · ${p.local_contexto}` : ""}
                    </p>
                  </div>
                </div>
                {podeEditar && (
                  <button onClick={() => abrirEdicao(p)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline transition shrink-0">
                    Editar
                  </button>
                )}
              </div>

              {p.participantes?.length > 0 && (
                <p className="text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-slate-400">Participantes:</span> {p.participantes.join(", ")}
                </p>
              )}

              {p.comportamentos_alvo?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {p.comportamentos_alvo.map((c, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-red-700">🎯 {c.comportamento}</p>
                      {c.definicao && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{c.definicao}</p>}
                    </div>
                  ))}
                </div>
              )}

              {p.estrategias_gerais && (
                <div className="mb-2">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide mb-1">Estratégias gerais</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{p.estrategias_gerais}</p>
                </div>
              )}

              {p.proxima_revisao && (
                <p className="text-xs text-slate-400">
                  Próxima revisão prevista: {new Date(p.proxima_revisao + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
