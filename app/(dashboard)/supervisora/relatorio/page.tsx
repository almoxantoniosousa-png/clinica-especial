"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { FileText, Plus, MessageSquare } from "lucide-react";

type Crianca = { id: string; nome: string };

type Relatorio = {
  id: string;
  crianca_id: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  feedback_gestao: string | null;
  feedback_por: string | null;
  feedback_em: string | null;
  criancas?: { nome: string };
};

export default function RelatorioSupervisoraPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [autorId, setAutorId] = useState("");
  const [autorNome, setAutorNome] = useState("");

  const [criancas, setCriancas] = useState<Crianca[]>([]);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [criancaId, setCriancaId] = useState("");
  const [dataEvento, setDataEvento] = useState(() => new Date().toISOString().slice(0, 10));
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: u } = await supabase.from("usuarios").select("id, nome").eq("email", user.email).maybeSingle();
      if (u) { setAutorId(u.id); setAutorNome(u.nome || ""); }

      const { data: cr } = await supabase.from("criancas").select("id, nome").eq("ativo", true).order("nome");
      setCriancas(cr || []);
    })();
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setLoading(false); return; }
    const { data: u } = await supabase.from("usuarios").select("id").eq("email", user.email).maybeSingle();
    if (!u) { setLoading(false); return; }

    const { data } = await supabase
      .from("prontuarios")
      .select("id, crianca_id, titulo, conteudo, created_at, feedback_gestao, feedback_por, feedback_em, criancas(nome)")
      .eq("tipo", "relatorio_supervisora")
      .eq("autor_id", u.id)
      .order("created_at", { ascending: false });
    setRelatorios((data ?? []) as unknown as Relatorio[]);
    setLoading(false);
  }

  function abrirNovo() {
    setCriancaId("");
    setDataEvento(new Date().toISOString().slice(0, 10));
    setTexto("");
    setErro("");
    setModalAberto(true);
  }

  async function salvar() {
    if (!criancaId || !texto.trim()) { setErro("Selecione a criança e descreva o que aconteceu."); return; }
    setSalvando(true);
    setErro("");

    const nomeCrianca = criancas.find(c => c.id === criancaId)?.nome || "Criança";
    const conteudo = JSON.stringify({ texto: texto.trim(), data_evento: dataEvento });

    const { data: novo, error } = await supabase.from("prontuarios").insert([{
      crianca_id: criancaId,
      autor_id: autorId,
      autor_nome: autorNome || null,
      tipo: "relatorio_supervisora",
      titulo: `Relatório — ${nomeCrianca} — ${new Date(dataEvento + "T12:00:00").toLocaleDateString("pt-BR")}`,
      conteudo,
      visivel_familia: false,
      visivel_supervisora: true,
      visivel_gestao: true,
    }]).select().single();

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    await registrarLog(supabase, {
      usuario_email: autorNome, usuario_nome: autorNome, acao: "Registrou relatório de supervisão",
      tabela: "prontuarios", registro_id: novo?.id, descricao: `${nomeCrianca} — ${texto.trim().slice(0, 120)}`,
    });

    await supabase.from("notificacoes").insert({
      destinatario_role: "gestao",
      titulo: "📝 Novo relatório da Supervisora",
      mensagem: `${autorNome} registrou um relatório sobre ${nomeCrianca}`,
      tipo: "relatorio",
      link: "/gestao/relatorios",
      autor_nome: autorNome || null,
    });

    setModalAberto(false);
    carregar();
  }

  function parseConteudo(r: Relatorio) {
    try { return JSON.parse(r.conteudo); } catch { return null; }
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 transition";

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📝 Relatório</h1>
          <p className="text-xs text-slate-400 mt-0.5">Registre o que aconteceu quando você ficou com uma criança.</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors self-start">
          <Plus className="h-4 w-4" /> Novo relatório
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : relatorios.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText className="h-10 w-10 mx-auto text-slate-300" />
          <p className="text-sm text-slate-400 mt-2">Nenhum relatório registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {relatorios.map((r) => {
            const conteudo = parseConteudo(r);
            return (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{r.criancas?.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  {r.feedback_gestao && (
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Com feedback
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{conteudo?.texto}</p>

                {r.feedback_gestao && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-blue-50/50 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">
                      Feedback de {r.feedback_por || "Gestão"}
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{r.feedback_gestao}</p>
                    {r.feedback_em && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(r.feedback_em).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-slate-800">Novo relatório</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Criança</label>
                <select value={criancaId} onChange={(e) => setCriancaId(e.target.value)} className={`mt-1 ${inputClass}`}>
                  <option value="">Selecione...</option>
                  {criancas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</label>
                <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">O que aconteceu *</label>
                <textarea rows={6} placeholder="Descreva o momento com a criança..." value={texto}
                  onChange={(e) => setTexto(e.target.value)} className={`mt-1 ${inputClass} resize-none`} />
              </div>
            </div>

            {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !criancaId || !texto.trim()}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Registrar relatório"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
