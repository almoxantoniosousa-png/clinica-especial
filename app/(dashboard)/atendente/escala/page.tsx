"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Clock, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const HORARIOS = [
  "13:00 – 13:30",
  "13:30 – 14:30",
  "14:30 – 15:30",
  "15:00 – 16:00",
  "15:30 – 16:00",
  "16:00 – 17:00",
  "17:00 – 18:00",
];

type EscalaItem = {
  id: string;
  dia: string;
  horario: string;
  crianca: string;
  servico: string;
  profissional_nome: string | null;
};

function getCorServico(servico: string) {
  const s = servico.toLowerCase();
  if (s.includes("avd"))      return "bg-orange-100 text-orange-800 border-orange-200";
  if (s.includes("reforço") || s.includes("reforco")) return "bg-purple-100 text-purple-800 border-purple-200";
  if (s.includes("to"))       return "bg-teal-100 text-teal-800 border-teal-200";
  if (s === "simone")         return "bg-pink-100 text-pink-800 border-pink-200";
  if (s === "juliana")        return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "joão" || s === "joao") return "bg-green-100 text-green-800 border-green-200";
  if (s === "bia moura")      return "bg-red-100 text-red-800 border-red-200";
  if (s === "geovana")        return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s === "franciele")      return "bg-indigo-100 text-indigo-800 border-indigo-200";
  if (s === "elaine")         return "bg-cyan-100 text-cyan-800 border-cyan-200";
  if (s === "muralha")        return "bg-slate-100 text-slate-800 border-slate-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export default function AtendenteEscalaPage() {
  const supabase = createSupabaseBrowserClient();

  const [escala, setEscala] = useState<EscalaItem[]>([]);
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

      const { data: atendente, error: atError } = await supabase
        .from("atendentes")
        .select("id, nome")
        .eq("usuario_id", userData.user.id)
        .single();

      if (atError || !atendente) {
        setErro("Perfil de atendente não encontrado. Contate o administrador.");
        setLoading(false);
        return;
      }

      setProfissionalNome(atendente.nome);

      const { data: escalaData, error: escalaError } = await supabase
        .from("escala")
        .select("id, dia, horario, crianca, servico, profissional_nome")
        .eq("profissional_id", atendente.id)
        .order("horario", { ascending: true });

      if (escalaError) throw new Error(escalaError.message);

      setEscala(escalaData ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  const slotsDoDia = escala.filter((s) => s.dia === dia);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Minha Escala
          </h1>
          {profissionalNome && (
            <p className="text-sm text-slate-400 mt-1">
              Atendente: <span className="font-medium text-slate-600">{profissionalNome}</span>
            </p>
          )}
        </div>
      </div>

      {/* Navegação de dias */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDiaAtivo((p) => Math.max(0, p - 1))}
          disabled={diaAtivo === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2 flex-1 overflow-x-auto">
          {DIAS.map((d, i) => (
            <button
              key={d}
              onClick={() => setDiaAtivo(i)}
              className={`flex-1 min-w-[80px] py-2 rounded-xl text-sm font-semibold transition-all ${
                diaAtivo === i
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-blue-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={() => setDiaAtivo((p) => Math.min(4, p + 1))}
          disabled={diaAtivo === 4}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Erro */}
      {!loading && erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{erro}</div>
      )}

      {/* Horários agrupados */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando sua escala...</div>
      ) : !erro && (
        <div className="space-y-3">
          {HORARIOS.map((horario) => {
            const slotsHorario = slotsDoDia.filter((s) => s.horario === horario);
            if (slotsHorario.length === 0) return null;
            return (
              <div key={horario} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center gap-2 border-b border-slate-200">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">{horario}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {slotsHorario.length} atendimento{slotsHorario.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {slotsHorario.map((slot) => (
                      <div
                        key={slot.id}
                        className={`flex flex-col px-3 py-2 rounded-lg border text-xs font-medium ${getCorServico(slot.servico)}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{slot.crianca}</span>
                          <span className="opacity-60">·</span>
                          <span>{slot.servico}</span>
                        </div>
                        {slot.profissional_nome && (
                          <span className="text-xs opacity-70 mt-0.5">
                            👤 {slot.profissional_nome}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {slotsDoDia.length === 0 && (
            <div className="rounded-xl border border-slate-200 p-10 text-center">
              <div className="text-4xl mb-2">🗓️</div>
              <p className="text-sm text-slate-400">Nenhum atendimento neste dia.</p>
            </div>
          )}
        </div>
      )}

      {/* Resumo semanal */}
      {!loading && !erro && escala.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-700 font-medium">
            📊 Total na semana: <span className="font-bold">{escala.length}</span> atendimento{escala.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Legenda */}
      {!loading && !erro && (
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Legenda</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "AVD",       cor: "bg-orange-100 text-orange-800 border-orange-200" },
              { label: "Reforço",   cor: "bg-purple-100 text-purple-800 border-purple-200" },
              { label: "TO",        cor: "bg-teal-100 text-teal-800 border-teal-200" },
              { label: "Simone",    cor: "bg-pink-100 text-pink-800 border-pink-200" },
              { label: "Juliana",   cor: "bg-blue-100 text-blue-800 border-blue-200" },
              { label: "João",      cor: "bg-green-100 text-green-800 border-green-200" },
              { label: "Bia Moura", cor: "bg-red-100 text-red-800 border-red-200" },
              { label: "Geovana",   cor: "bg-yellow-100 text-yellow-800 border-yellow-200" },
              { label: "Franciele", cor: "bg-indigo-100 text-indigo-800 border-indigo-200" },
              { label: "Elaine",    cor: "bg-cyan-100 text-cyan-800 border-cyan-200" },
              { label: "Muralha",   cor: "bg-slate-100 text-slate-800 border-slate-200" },
            ].map((item) => (
              <span key={item.label} className={`px-2 py-1 rounded-md border text-xs font-medium ${item.cor}`}>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
