"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Check, ClipboardCheck } from "lucide-react";

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
type Protocolo = { id: string; cargo: string; titulo: string; conteudo: string };
type Confirmacao = { protocolo_id: string; confirmado_em: string };

export default function MeusProtocolosPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [eu, setEu] = useState<Pessoa | null>(null);
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [confirmacoes, setConfirmacoes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

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
        supabase.from("protocolos_conduta").select("id, cargo, titulo, conteudo").in("cargo", cargos).order("titulo"),
        supabase.from("protocolos_confirmacoes").select("protocolo_id, confirmado_em").eq("pessoa_id", perfil.id),
      ]);
      setProtocolos((prot || []) as Protocolo[]);
      const mapa: Record<string, string> = {};
      for (const c of (conf || []) as Confirmacao[]) mapa[c.protocolo_id] = c.confirmado_em;
      setConfirmacoes(mapa);
      setLoading(false);
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
                    <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                      {p.cargo}
                    </span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
