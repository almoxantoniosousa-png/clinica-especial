"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Pencil, Trash2, X, Plus } from "lucide-react";

type Item = {
  colaboradora_id: string;
  nome: string;
  cargo: string | null;
  dias: string[];
  horario_inicio: string;
  horario_fim: string;
};

type Colaboradora = {
  id: string;
  nome: string;
  cargo: string | null;
};

const ORDEM_DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const FORM_VAZIO = {
  colaboradora_id: "",
  dias: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"] as string[],
  horario_inicio: "08:00",
  horario_fim: "18:00",
};

export default function EscalaAdministrativaPage() {
  const supabase = createSupabaseBrowserClient();
  const [itens, setItens] = useState<Item[]>([]);
  const [colaboradoras, setColaboradoras] = useState<Colaboradora[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoColaboradoraId, setEditandoColaboradoraId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [excluindoNome, setExcluindoNome] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const [{ data: escalaData }, { data: colabData }] = await Promise.all([
      supabase
        .from("escala_administrativa")
        .select("colaboradora_id, dia, horario_inicio, horario_fim, colaboradoras_internas(nome, cargo, ativo)")
        .order("dia"),
      supabase.from("colaboradoras_internas").select("id, nome, cargo").eq("ativo", true).order("nome"),
    ]);

    const mapa = new Map<string, Item>();
    (escalaData ?? []).forEach((r: any) => {
      if (!r.colaboradoras_internas?.ativo) return;
      const existente = mapa.get(r.colaboradora_id);
      if (existente && existente.horario_inicio === r.horario_inicio && existente.horario_fim === r.horario_fim) {
        existente.dias.push(r.dia);
      } else {
        mapa.set(r.colaboradora_id, {
          colaboradora_id: r.colaboradora_id,
          nome: r.colaboradoras_internas.nome,
          cargo: r.colaboradoras_internas.cargo,
          dias: [r.dia],
          horario_inicio: r.horario_inicio,
          horario_fim: r.horario_fim,
        });
      }
    });

    const lista = Array.from(mapa.values()).map((item) => ({
      ...item,
      dias: item.dias.sort((a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b)),
      horario_inicio: item.horario_inicio.slice(0, 5),
      horario_fim: item.horario_fim.slice(0, 5),
    }));
    lista.sort((a, b) => a.nome.localeCompare(b.nome));
    setItens(lista);
    setColaboradoras(colabData ?? []);
    setLoading(false);
  }

  function faixaDias(dias: string[]) {
    if (dias.length === 5 && dias[0] === "Segunda" && dias[4] === "Sexta") return "Segunda a Sexta";
    return dias.join(", ");
  }

  function abrirNovo() {
    setEditandoColaboradoraId(null);
    setForm(FORM_VAZIO);
    setErroForm("");
    setModalAberto(true);
  }

  function abrirEditar(item: Item) {
    setEditandoColaboradoraId(item.colaboradora_id);
    setForm({
      colaboradora_id: item.colaboradora_id,
      dias: item.dias,
      horario_inicio: item.horario_inicio,
      horario_fim: item.horario_fim,
    });
    setErroForm("");
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoColaboradoraId(null);
    setErroForm("");
  }

  function toggleDia(dia: string) {
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter((d) => d !== dia) : [...f.dias, dia],
    }));
  }

  async function salvar() {
    if (!form.colaboradora_id) { setErroForm("Selecione a colaboradora."); return; }
    if (form.dias.length === 0) { setErroForm("Selecione ao menos um dia."); return; }
    if (!form.horario_inicio || !form.horario_fim) { setErroForm("Preencha horário de início e fim."); return; }

    setSalvando(true);
    setErroForm("");

    // Remove os dias antigos dessa colaboradora e recria com o que foi definido agora
    await supabase.from("escala_administrativa").delete().eq("colaboradora_id", form.colaboradora_id);

    const payload = form.dias.map((dia) => ({
      colaboradora_id: form.colaboradora_id,
      dia,
      horario_inicio: form.horario_inicio,
      horario_fim: form.horario_fim,
    }));

    const { error } = await supabase.from("escala_administrativa").insert(payload);

    setSalvando(false);

    if (error) {
      setErroForm(error.message);
      return;
    }

    fecharModal();
    carregar();
  }

  async function excluir() {
    if (!excluindoId) return;
    setExcluindo(true);
    await supabase.from("escala_administrativa").delete().eq("colaboradora_id", excluindoId);
    setExcluindoId(null);
    setExcluindoNome("");
    setExcluindo(false);
    carregar();
  }

  const colaboradorasSemEscala = colaboradoras.filter(
    (c) => editandoColaboradoraId === c.id || !itens.some((i) => i.colaboradora_id === c.id)
  );

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Escala Administrativa</h1>
          <p className="text-xs text-slate-400 mt-0.5">Horário de trabalho de Auxiliares Administrativas e Agentes de Limpeza.</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Plus className="h-4 w-4" />
          Nova escala
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-5xl">🗓️</span>
          <p className="text-sm text-slate-400 mt-2">Nenhuma escala cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => (
            <div key={item.colaboradora_id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{item.nome}</p>
                {item.cargo && <p className="text-xs text-slate-400 mt-0.5">{item.cargo}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                  {faixaDias(item.dias)} · {item.horario_inicio}–{item.horario_fim}
                </span>
                <button onClick={() => abrirEditar(item)} title="Editar"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setExcluindoId(item.colaboradora_id); setExcluindoNome(item.nome); }} title="Excluir"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {excluindoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Remover escala?</h3>
                <p className="text-sm text-slate-500 mt-1">{excluindoNome}</p>
                <p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setExcluindoId(null); setExcluindoNome(""); }} disabled={excluindo}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={excluir} disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">
                {excluindo ? "Removendo..." : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO / EDIÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                {editandoColaboradoraId ? "Editar escala" : "Nova escala"}
              </h2>
              <button onClick={fecharModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Colaboradora</label>
                <select value={form.colaboradora_id} onChange={(e) => setForm((f) => ({ ...f, colaboradora_id: e.target.value }))}
                  disabled={!!editandoColaboradoraId}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500">
                  <option value="">Selecione...</option>
                  {colaboradorasSemEscala.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}{c.cargo ? ` — ${c.cargo}` : ""}</option>
                  ))}
                </select>
                {!editandoColaboradoraId && colaboradorasSemEscala.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Todas as colaboradoras já têm uma escala cadastrada. Feche esta janela e use o lápis (✏️) no card dela pra editar.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Dias da semana</label>
                <div className="flex flex-wrap gap-1.5">
                  {ORDEM_DIAS.map((dia) => (
                    <button key={dia} type="button" onClick={() => toggleDia(dia)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        form.dias.includes(dia)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}>
                      {dia.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Início</label>
                  <input type="time" value={form.horario_inicio} onChange={(e) => setForm((f) => ({ ...f, horario_inicio: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Fim</label>
                  <input type="time" value={form.horario_fim} onChange={(e) => setForm((f) => ({ ...f, horario_fim: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
            </div>

            {erroForm && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroForm}</p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={fecharModal} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors">
                {salvando ? "Salvando..." : editandoColaboradoraId ? "Salvar alterações" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
