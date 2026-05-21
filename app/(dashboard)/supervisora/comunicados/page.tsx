"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SupervisoraPage() {
  const [formularios, setFormularios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendentes" | "aprovados" | "todos">("pendentes");
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [obs, setObs] = useState("");
  const [aprovando, setAprovando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("formularios_escolares")
      .select("*, criancas(nome, foto_url)")
      .order("created_at", { ascending: false });

    if (error) mostrarFeedback("erro", "Erro ao carregar: " + error.message);
    setFormularios(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function aprovar(id: string) {
    setAprovando(true);
    const { error } = await supabase
      .from("formularios_escolares")
      .update({
        enviado_familia: true,
        obs_supervisora: obs,
      })
      .eq("id", id);
    setAprovando(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao aprovar: " + error.message);
    } else {
      mostrarFeedback("sucesso", "Comunicado aprovado e liberado para a família!");
      setDetalhe(null);
      setObs("");
      carregar();
    }
  }

  const filtrados = formularios.filter(f => {
    if (filtro === "pendentes") return f.enviado_supervisora && !f.enviado_familia;
    if (filtro === "aprovados") return f.enviado_familia;
    return true;
  });

  const totalPendentes = formularios.filter(f => f.enviado_supervisora && !f.enviado_familia).length;

  function iniciais(nome: string) {
    return nome?.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?";
  }

  const interacaoLabels: any = {
    "Cumprimenta Pares": "👋 Cumprimenta Pares",
    "Cumprimenta Adultos": "👋 Cumprimenta Adultos",
    "Interage na Sala": "🏫 Interage na Sala",
    "Abraça/Contato Físico": "🤗 Abraça/Contato Físico",
  };

  const autonomiaLabels: any = {
    1: { label: "Dependência Total", color: "bg-red-100 text-red-700" },
    2: { label: "Ajuda Física/Verbal", color: "bg-amber-100 text-amber-700" },
    3: { label: "Independência Parcial", color: "bg-blue-100 text-blue-700" },
    4: { label: "Independência Total", color: "bg-emerald-100 text-emerald-700" },
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md bg-white p-0.5">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
              <h1 className="text-xl md:text-2xl font-bold text-blue-900">Portal da Supervisora</h1>
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
              Comunicados Diários — Revisão e Aprovação
            </p>
          </div>
        </div>

        {/* Badge pendentes */}
        {totalPendentes > 0 && (
          <div className="self-start sm:self-auto flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/>
            <span className="text-sm font-bold text-amber-700">{totalPendentes} pendente{totalPendentes !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={"flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border " +
          (feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* FILTROS */}
      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit">
        {[
          { key: "pendentes", label: "Pendentes", icon: "⏳" },
          { key: "aprovados", label: "Aprovados", icon: "✅" },
          { key: "todos", label: "Todos", icon: "📋" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key as any)}
            className={"px-4 py-2 rounded-xl text-sm font-semibold transition " +
              (filtro === f.key
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50")}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-slate-400">Carregando comunicados...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">{filtro === "pendentes" ? "🎉" : "📋"}</span>
          <p className="text-sm text-slate-400 font-medium">
            {filtro === "pendentes" ? "Nenhum comunicado pendente!" : "Nenhum comunicado encontrado."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(f => (
            <div
              key={f.id}
              className={"bg-white rounded-2xl border shadow-sm p-4 transition cursor-pointer hover:shadow-md " +
                (!f.enviado_familia ? "border-l-4 border-l-amber-400 border-slate-200" : "border-l-4 border-l-emerald-400 border-slate-200")}
              onClick={() => { setDetalhe(f); setObs(""); }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Foto da criança */}
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                    {f.criancas?.foto_url
                      ? <img src={f.criancas.foto_url} alt={f.criancas.nome} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {iniciais(f.criancas?.nome)}
                        </div>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{f.criancas?.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(f.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </p>
                    {f.hora_chegada && (
                      <p className="text-xs text-slate-400">Chegada: {f.hora_chegada}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={"text-xs font-bold px-2.5 py-1 rounded-full border " +
                    (f.enviado_familia
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-amber-50 text-amber-700 border-amber-100")}>
                    {f.enviado_familia ? "✓ Aprovado" : "⏳ Pendente"}
                  </span>
                  <span className="text-slate-300 text-lg">›</span>
                </div>
              </div>

              {/* Preview das informações */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {f.interacao?.map((i: string) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{i}</span>
                ))}
                {f.autonomia_nivel > 0 && (
                  <span className={"text-xs px-2 py-0.5 rounded-full " + (autonomiaLabels[f.autonomia_nivel]?.color || "bg-slate-100 text-slate-600")}>
                    {autonomiaLabels[f.autonomia_nivel]?.label}
                  </span>
                )}
                {f.evacuou && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✅ Evacuou</span>}
                {f.periodo_menstrual && <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">🩸 P. Menstrual</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE DETALHE */}
      {detalhe && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}
        >
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Cabeçalho do modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                  {detalhe.criancas?.foto_url
                    ? <img src={detalhe.criancas.foto_url} alt={detalhe.criancas.nome} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{iniciais(detalhe.criancas?.nome)}</div>}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{detalhe.criancas?.nome}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(detalhe.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <button onClick={() => setDetalhe(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition">✕</button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* Etapa 1 */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">🏁 Entrada e Interação</p>
                {detalhe.hora_chegada && <p className="text-sm text-slate-700">Chegada: <span className="font-semibold">{detalhe.hora_chegada}</span></p>}
                <div className="flex flex-wrap gap-1.5">
                  {detalhe.interacao?.map((i: string) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">{i}</span>
                  ))}
                </div>
              </div>

              {/* Etapa 2 */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">🛠 Autonomia e Higiene</p>
                {detalhe.autonomia_nivel > 0 && (
                  <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + (autonomiaLabels[detalhe.autonomia_nivel]?.color)}>
                    {autonomiaLabels[detalhe.autonomia_nivel]?.label}
                  </span>
                )}
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={"text-xs px-2.5 py-1 rounded-full " + (detalhe.evacuou ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                    {detalhe.evacuou ? "✅ Evacuou" : "✗ Não evacuou"}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                    🚽 {detalhe.idas_banheiro || 0} idas ao banheiro
                  </span>
                  {detalhe.periodo_menstrual && (
                    <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full">🩸 Período menstrual</span>
                  )}
                </div>
              </div>

              {/* Etapa 3 */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">🏀 Recreio e Socialização</p>
                <div className="flex flex-wrap gap-1.5">
                  {detalhe.socializacao?.map((s: string) => (
                    <span key={s} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full border border-purple-100">{s}</span>
                  ))}
                  {detalhe.atencao?.map((a: string) => (
                    <span key={a} className="text-xs bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-full border border-cyan-100">{a}</span>
                  ))}
                </div>
                {detalhe.lanche && (
                  <p className="text-sm text-slate-700">
                    Lanche: <span className="font-semibold">{detalhe.lanche}</span>
                    {detalhe.comeu_tudo && <span className="ml-2 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Comeu tudo</span>}
                  </p>
                )}
              </div>

              {/* Etapa 4 */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">📖 Agenda e Recados</p>
                {detalhe.atividades_sala && (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold">Conteúdo de sala:</p>
                    <p className="text-sm text-slate-700">{detalhe.atividades_sala}</p>
                  </div>
                )}
                {detalhe.tarefa_casa && (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold">Tarefa de casa:</p>
                    <p className="text-sm text-slate-700">{detalhe.tarefa_casa}</p>
                  </div>
                )}
                {detalhe.materiais_pedir && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-xs text-red-600 font-bold">⚠️ Avisos urgentes:</p>
                    <p className="text-sm text-slate-700 mt-1">{detalhe.materiais_pedir}</p>
                  </div>
                )}
                {detalhe.obs_gerais && (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold">Observações gerais:</p>
                    <p className="text-sm text-slate-700">{detalhe.obs_gerais}</p>
                  </div>
                )}
              </div>

              {/* Observação da supervisora */}
              {!detalhe.enviado_familia && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">✍️ Sua observação (opcional)</p>
                  <textarea
                    rows={3}
                    value={obs}
                    onChange={e => setObs(e.target.value)}
                    placeholder="Adicione uma observação antes de liberar para os pais..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800
                      focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 resize-none"
                  />
                </div>
              )}

              {detalhe.obs_supervisora && detalhe.enviado_familia && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-600 font-bold">Sua observação:</p>
                  <p className="text-sm text-slate-700 mt-1">{detalhe.obs_supervisora}</p>
                </div>
              )}
            </div>

            {/* Botões */}
            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
              {!detalhe.enviado_familia ? (
                <div className="flex gap-3">
                  <button onClick={() => setDetalhe(null)}
                    className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                    Fechar
                  </button>
                  <button
                    onClick={() => aprovar(detalhe.id)}
                    disabled={aprovando}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-50 active:scale-95">
                    {aprovando ? "Aprovando..." : "✓ Aprovar e Liberar"}
                  </button>
                </div>
              ) : (
                <button onClick={() => setDetalhe(null)}
                  className="w-full h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}