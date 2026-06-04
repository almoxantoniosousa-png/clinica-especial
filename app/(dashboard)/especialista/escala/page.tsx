"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Clock, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

type EscalaItem = {
  id: string;
  dia: string;
  horario: string;
  crianca: string;
  servico: string;
  profissional_nome: string | null;
};

const CORES = [
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-red-100 text-red-800 border-red-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-slate-100 text-slate-800 border-slate-200",
  "bg-amber-100 text-amber-800 border-amber-200",
];

function getCorServico(servico: string, corMap: Record<string, string>) {
  return corMap[servico] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

export default function EspecialistaEscalaPage() {
  const supabase = createSupabaseBrowserClient();

  const [escala, setEscala] = useState<EscalaItem[]>([]);
  const [servicos, setServicos] = useState<string[]>([]);
  const [profissionalNome, setProfissionalNome] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [diaAtivo, setDiaAtivo] = useState(0);

  const dia = DIAS[diaAtivo];

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    setErro("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Usuário não autenticado.");

      const { data: profissional, error: profError } = await supabase
        .from("atendentes")
        .select("id, nome")
        .eq("usuario_id", userData.user.id)
        .single();

      if (profError || !profissional) {
        setErro("Perfil de especialista não encontrado. Contate o administrador.");
        setLoading(false);
        return;
      }

      setProfissionalNome(profissional.nome);

      const [escalaRes, servicosRes] = await Promise.all([
        supabase
          .from("escala")
          .select("id, dia, horario, crianca, servico, profissional_nome")
          .eq("profissional_id", profissional.id)
          .order("horario", { ascending: true }),
        supabase.from("tipos_atendimento").select("nome").eq("ativo", true).order("nome"),
      ]);

      if (escalaRes.error) throw new Error(escalaRes.error.message);

      setEscala(escalaRes.data ?? []);
      setServicos((servicosRes.data ?? []).map((s) => s.nome));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  const slotsDoDia = escala.filter((s) => s.dia === dia);

  const corMap: Record<string, string> = {};
  servicos.forEach((nome, i) => { corMap[nome] = CORES[i % CORES.length]; });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-600" />
            Minha Escala
          </h1>
          {profissionalNome && (
            <p className="text-sm text-slate-400 mt-1">
              Especialista: <span className="font-medium text-slate-600">{profissionalNome}</span>
            </p>
          )}
        </div>
      </div>

      {/* Navegação de dias */}
      <div className="flex items-center gap-2">
        <button onClick={() => setDiaAtivo((p) => Math.max(0, p - 1))} disabled={diaAtivo === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {DIAS.map((d, i) => (
            <button key={d} onClick={() => setDiaAtivo(i)}
              className={`flex-1 min-w-[80px] py-2 rounded-xl text-sm font-semibold transition-all ${
                diaAtivo === i ? "bg-purple-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600 hover:bg-purple-50"
              }`}>
              {d}
            </button>
          ))}
        </div>
        <button onClick={() => setDiaAtivo((p) => Math.min(4, p + 1))} disabled={diaAtivo === 4}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando sua escala...</div>
      )}

      {/* Erro */}
      {!loading && erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{erro}</div>
      )}

      {/* Atendimentos do dia */}
      {!loading && !erro && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 flex items-center gap-2 border-b border-slate-200">
            <Clock className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold text-slate-700">{dia}</span>
            <span className="ml-auto text-xs text-slate-400">
              {slotsDoDia.length} atendimento{slotsDoDia.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="p-3">
            {slotsDoDia.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">🗓️</div>
                <p className="text-sm text-slate-400">Nenhum atendimento neste dia.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {slotsDoDia.map((item) => (
                  <div key={item.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs font-medium ${getCorServico(item.servico, corMap)}`}>
                    <span className="font-mono font-bold w-24 shrink-0">{item.horario}</span>
                    <span className="font-bold">{item.crianca}</span>
                    <span className="opacity-60">·</span>
                    <span>{item.servico}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumo */}
      {!loading && !erro && escala.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <p className="text-sm text-purple-700 font-medium">
            📊 Total na semana: <span className="font-bold">{escala.length}</span> atendimento{escala.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}