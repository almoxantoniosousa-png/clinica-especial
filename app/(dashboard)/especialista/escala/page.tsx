"use client";

/**
 * especialista/escala/page.tsx
 *
 * Idêntico ao atendente/escala, mas busca o profissional
 * na tabela `especialistas` (ou `atendentes` conforme seu schema).
 * Ajuste a query `.from(...)` conforme a tabela real usada para especialistas.
 */

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type EscalaItem = {
  id: string;
  dia: string;
  horario: string;
  crianca: string;
  servico: string;
  profissional_nome: string | null;
};

type TipoAtendimento = { nome: string; cor: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarDia(dia: string) {
  return new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function diaSemanaAbrev(dia: string) {
  return new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
  });
}

function hoje() {
  return new Date().toISOString().split("T")[0];
}

function agruparPorDia(itens: EscalaItem[]): Record<string, EscalaItem[]> {
  return itens.reduce(
    (acc, item) => {
      if (!acc[item.dia]) acc[item.dia] = [];
      acc[item.dia].push(item);
      return acc;
    },
    {} as Record<string, EscalaItem[]>
  );
}

function inicioSemanaAtual() {
  const d = new Date();
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EspecialistaEscalaPage() {
  const supabase = createSupabaseBrowserClient();

  const [escala, setEscala] = useState<EscalaItem[]>([]);
  const [tipos, setTipos] = useState<TipoAtendimento[]>([]);
  const [profissionalNome, setProfissionalNome] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [semanaInicio, setSemanaInicio] = useState(inicioSemanaAtual);

  useEffect(() => {
    carregarDados();
  }, [semanaInicio]);

  async function carregarDados() {
    setLoading(true);
    setErro("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Usuário não autenticado.");

      const userId = userData.user.id;

      // ─────────────────────────────────────────────────────────────────────
      // AJUSTE AQUI: se especialistas usam a tabela `atendentes` com um campo
      // `tipo` ou `role`, adicione o filtro correspondente:
      //
      //   .from("atendentes").select("id, nome").eq("usuario_id", userId).eq("tipo", "especialista")
      //
      // Ou se houver tabela separada `especialistas`:
      //   .from("especialistas").select("id, nome").eq("usuario_id", userId)
      // ─────────────────────────────────────────────────────────────────────
      const { data: profissional, error: profError } = await supabase
        .from("atendentes") // ← ajuste se necessário
        .select("id, nome")
        .eq("usuario_id", userId)
        .single();

      if (profError || !profissional) {
        setErro("Perfil de especialista não encontrado. Contate o administrador.");
        setLoading(false);
        return;
      }

      setProfissionalNome(profissional.nome);

      // Calcular fim da semana
      const inicio = new Date(semanaInicio + "T12:00:00");
      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 6);
      const fimStr = fim.toISOString().split("T")[0];

      const { data: escalaData, error: escalaError } = await supabase
        .from("escala")
        .select("id, dia, horario, crianca, servico, profissional_nome")
        .eq("profissional_id", profissional.id)
        .gte("dia", semanaInicio)
        .lte("dia", fimStr)
        .order("dia", { ascending: true })
        .order("horario", { ascending: true });

      if (escalaError) throw new Error(escalaError.message);

      setEscala(escalaData ?? []);

      const { data: tiposData } = await supabase
        .from("tipos_atendimento")
        .select("nome, cor")
        .eq("ativo", true);
      setTipos(tiposData ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  function navegarSemana(direcao: -1 | 1) {
    const d = new Date(semanaInicio + "T12:00:00");
    d.setDate(d.getDate() + direcao * 7);
    setSemanaInicio(d.toISOString().split("T")[0]);
  }

  const semanaFimDisplay = (() => {
    const d = new Date(semanaInicio + "T12:00:00");
    d.setDate(d.getDate() + 6);
    return d.toLocaleDateString("pt-BR");
  })();

  const escalaAgrupada = agruparPorDia(escala);
  const diasComAtendimento = Object.keys(escalaAgrupada).sort();
  const todayStr = hoje();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📅 Minha Escala</h1>
        {profissionalNome && (
          <p className="text-sm text-gray-500 mt-1">
            Especialista:{" "}
            <span className="font-medium text-gray-700">{profissionalNome}</span>
          </p>
        )}
      </div>

      {/* Navegação de semana */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={() => navegarSemana(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ‹
        </button>

        <div className="flex-1 text-center">
          <p className="text-sm font-medium text-gray-700">
            {new Date(semanaInicio + "T12:00:00").toLocaleDateString("pt-BR")} —{" "}
            {semanaFimDisplay}
          </p>
        </div>

        <button
          onClick={() => navegarSemana(1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ›
        </button>

        <button
          onClick={() => setSemanaInicio(inicioSemanaAtual())}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium px-3 py-1.5 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">⏳</div>
          Carregando sua escala...
        </div>
      )}

      {/* Erro */}
      {!loading && erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Vazio */}
      {!loading && !erro && escala.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">🗓️</div>
          <p className="text-gray-500 text-sm">Nenhum atendimento nesta semana.</p>
          <p className="text-gray-400 text-xs mt-1">
            Se isso parecer incorreto, contate o administrador.
          </p>
        </div>
      )}

      {/* Cards por dia */}
      {!loading && !erro && diasComAtendimento.length > 0 && (
        <div className="space-y-4">
          {diasComAtendimento.map((dia) => {
            const isHoje = dia === todayStr;
            const atendimentos = escalaAgrupada[dia];

            return (
              <div
                key={dia}
                className={`bg-white rounded-xl border overflow-hidden ${
                  isHoje
                    ? "border-purple-400 shadow-md shadow-purple-100"
                    : "border-gray-200"
                }`}
              >
                {/* Header do dia */}
                <div
                  className={`px-5 py-3 flex items-center gap-3 ${
                    isHoje
                      ? "bg-purple-600"
                      : "bg-gray-50 border-b border-gray-200"
                  }`}
                >
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${
                      isHoje ? "text-purple-100" : "text-gray-400"
                    }`}
                  >
                    {diaSemanaAbrev(dia)}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isHoje ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {formatarDia(dia)}
                  </span>
                  <span
                    className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                      isHoje
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {atendimentos.length} atendimento
                    {atendimentos.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Lista */}
                <div className="divide-y divide-gray-50">
                  {atendimentos.map((item) => {
                    const tipo = tipos.find((t) => t.nome === item.servico);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-16 shrink-0">
                          <span className="text-sm font-mono font-semibold text-gray-700">
                            {item.horario}
                          </span>
                        </div>

                        <div
                          className="w-1 h-10 rounded-full shrink-0"
                          style={{ backgroundColor: tipo?.cor ?? "#d1d5db" }}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {item.crianca}
                          </p>
                          <span
                            className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5"
                            style={{
                              backgroundColor: tipo?.cor
                                ? tipo.cor + "20"
                                : "#f3f4f6",
                              color: tipo?.cor ?? "#6b7280",
                            }}
                          >
                            {item.servico}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      {!loading && !erro && escala.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <p className="text-sm text-purple-700 font-medium">
            📊 Resumo da semana:{" "}
            <span className="font-bold">{escala.length}</span> atendimento
            {escala.length !== 1 ? "s" : ""} em{" "}
            <span className="font-bold">{diasComAtendimento.length}</span> dia
            {diasComAtendimento.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}