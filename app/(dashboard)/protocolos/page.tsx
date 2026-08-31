"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { Check, ClipboardCheck, Paperclip } from "lucide-react";

// Mapeia o role do usuário logado para o(s) cargo(s) de protocolo correspondentes
const ROLE_PARA_CARGO: Record<string, string[]> = {
  especialista: ["Especialista"],
  atendente:    ["Acompanhante Terapêutico (AT)"],
  at:           ["Acompanhante Terapêutico (AT)"],
  supervisora:  ["Supervisora"],
  aux_adm:      ["Auxiliar Administrativo"],
  gestao:       ["Gestão"],
  financeiro:   ["Financeiro"],
};

type Pessoa = { id: string; nome: string; role: string };
type Protocolo = { id: string; cargos: string[]; titulo: string; conteudo: string; anexo_url?: string | null; anexo_nome?: string | null };
type Confirmacao = { protocolo_id: string; confirmado_em: string };
type ConfirmacaoNome = { protocolo_id: string; pessoa_id: string; pessoa_nome: string; confirmado_em: string };

const CARGO_AT = "Acompanhante Terapêutico (AT)";

export default function MeusProtocolosPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [eu, setEu] = useState<Pessoa | null>(null);
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [confirmacoes, setConfirmacoes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  // Só carregado para a supervisora: acompanhamento de leitura da equipe de ATs.
  const [protocolosAT, setProtocolosAT] = useState<Protocolo[]>([]);
  const [confirmacoesAT, setConfirmacoesAT] = useState<ConfirmacaoNome[]>([]);
  const [equipeAT, setEquipeAT] = useState<{ id: string; nome: string }[]>([]);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      let perfil: Pessoa | null = null;
      const { data: a } = await supabase.from("atendentes").select("id, nome, role").eq("email", user.email).maybeSingle();
      if (a) perfil = a as Pessoa;
      if (!perfil) {
        const { data: u } = await supabase.from("usuarios").select("id, nome, role").eq("email", user.email).maybeSingle();
        if (u) perfil = u as Pessoa;
      }
      if (!perfil) { setLoading(false); return; }
      setEu(perfil);

      const cargos = ROLE_PARA_CARGO[perfil.role] ?? [];
      if (cargos.length === 0) { setLoading(false); return; }

      const [{ data: prot }, { data: conf }] = await Promise.all([
        supabase.from("protocolos_conduta").select("id, cargos, titulo, conteudo, anexo_url, anexo_nome").overlaps("cargos", cargos).order("titulo"),
        supabase.from("protocolos_confirmacoes").select("protocolo_id, confirmado_em").eq("pessoa_id", perfil.id),
      ]);
      setProtocolos((prot || []) as Protocolo[]);
      const mapa: Record<string, string> = {};
      for (const c of (conf || []) as Confirmacao[]) mapa[c.protocolo_id] = c.confirmado_em;
      setConfirmacoes(mapa);
      setLoading(false);

      if (perfil.role === "supervisora") {
        const { data: protAT } = await supabase.from("protocolos_conduta")
          .select("id, cargos, titulo, conteudo, anexo_url, anexo_nome").contains("cargos", [CARGO_AT]).order("titulo");
        const idsAT = ((protAT || []) as Protocolo[]).map(p => p.id);
        const [{ data: confAT }, { data: ats }] = await Promise.all([
          idsAT.length > 0
            ? supabase.from("protocolos_confirmacoes").select("protocolo_id, pessoa_id, pessoa_nome, confirmado_em").in("protocolo_id", idsAT)
            : Promise.resolve({ data: [] as ConfirmacaoNome[] }),
          supabase.from("atendentes").select("id, nome").eq("role", "atendente").eq("ativo", true).order("nome"),
        ]);
        setProtocolosAT((protAT || []) as Protocolo[]);
        setConfirmacoesAT((confAT || []) as ConfirmacaoNome[]);
        setEquipeAT((ats || []) as { id: string; nome: string }[]);
      }
    })();
  }, [supabase]);

  async function confirmar(p: Protocolo) {
    if (!eu) return;
    setConfirmando(p.id);
    const { error } = await supabase.from("protocolos_confirmacoes").insert({
      protocolo_id: p.id, pessoa_id: eu.id, pessoa_nome: eu.nome, pessoa_role: eu.role,
    }).select("confirmado_em").single();
    setConfirmando(null);
    if (error) { mostrarFeedback("erro", "Erro ao confirmar. Tente novamente."); return; }
    setConfirmacoes(prev => ({ ...prev, [p.id]: new Date().toISOString() }));
    mostrarFeedback("sucesso", "Leitura confirmada!");

    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      usuario_nome: eu.nome,
      acao: "Confirmou leitura",
      tabela: "protocolos_conduta",
      registro_id: p.id,
      descricao: `Confirmou a leitura do protocolo "${p.titulo}" (${p.cargos.join(", ")})`,
    });
  }

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Protocolos de Conduta</h1>
        <p className="text-xs text-slate-400 mt-0.5">Diretrizes de conduta e atividades da sua função</p>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
          feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>{feedback.msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : protocolos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">📜</span>
          <p className="text-sm text-slate-400">Nenhum protocolo publicado para a sua função ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {protocolos.map(p => {
            const confirmadoEm = confirmacoes[p.id];
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {p.cargos.map(c => (
                        <span key={c} className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                          {c}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">{p.titulo}</h3>
                  </div>
                  {confirmadoEm ? (
                    <span className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 flex-shrink-0">
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Confirmado em {new Date(confirmadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  ) : (
                    <button onClick={() => confirmar(p)} disabled={confirmando === p.id}
                      className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                      {confirmando === p.id ? "Confirmando..." : "Confirmar leitura"}
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{p.conteudo}</p>
                {p.anexo_url && (
                  <a href={p.anexo_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg border border-violet-100 transition">
                    <Paperclip className="h-3.5 w-3.5" />
                    Baixar {p.anexo_nome || "anexo"}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {eu?.role === "supervisora" && protocolosAT.length > 0 && (
        <div className="space-y-3">
          {protocolosAT.map(p => {
            const confirmaramIds = new Set(confirmacoesAT.filter(c => c.protocolo_id === p.id).map(c => c.pessoa_id));
            const confirmaram = confirmacoesAT.filter(c => c.protocolo_id === p.id).sort((a, b) => a.pessoa_nome.localeCompare(b.pessoa_nome));
            const pendentes = equipeAT.filter(at => !confirmaramIds.has(at.id));
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Leitura da equipe — {p.titulo}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Quem já confirmou ler a cartilha da AT</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5">Já confirmaram ({confirmaram.length})</p>
                    {confirmaram.length === 0 ? (
                      <p className="text-xs text-slate-400">Ninguém confirmou ainda.</p>
                    ) : (
                      <ul className="space-y-1">
                        {confirmaram.map(c => (
                          <li key={c.pessoa_id} className="text-xs text-slate-600 flex items-center justify-between gap-2">
                            <span className="truncate">{c.pessoa_nome}</span>
                            <span className="text-slate-400 flex-shrink-0">{new Date(c.confirmado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">Ainda não confirmaram ({pendentes.length})</p>
                    {pendentes.length === 0 ? (
                      <p className="text-xs text-slate-400">Todas confirmaram.</p>
                    ) : (
                      <ul className="space-y-1">
                        {pendentes.map(at => (
                          <li key={at.id} className="text-xs text-slate-600 truncate">{at.nome}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
