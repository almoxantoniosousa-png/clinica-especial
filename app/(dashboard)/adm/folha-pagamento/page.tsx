"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { DollarSign, Check, Clock, Plus, Pencil, X, ChevronDown, ChevronRight } from "lucide-react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type Profissional = { id: string; nome: string; especialidade: string; role: string; pix_key: string };
type Folha = {
  id: string;
  profissional_id: string;
  mes: number;
  ano: number;
  valor_base: number;
  adiantamento: number;
  desconto: number;
  valor_final: number;
  status: "pendente" | "pago";
  data_pagamento: string | null;
  observacao: string | null;
};

export default function FolhaPagamentoPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [folhas, setFolhas] = useState<Folha[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Folha | null>(null);
  const [profSelecionado, setProfSelecionado] = useState("");
  const [form, setForm] = useState({ valor_base: "", adiantamento: "0", desconto: "0", observacao: "" });
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  // Seções retráteis
  const [pendentesAberto, setPendentesAberto] = useState(true);
  const [pagosAberto, setPagosAberto] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  useEffect(() => { carregarDados(); }, [mes, ano]);

  async function carregarDados() {
    setLoading(true);
    const [{ data: profs }, { data: folhasData }] = await Promise.all([
      supabase.from("atendentes").select("id, nome, especialidade, role, pix_key").order("nome"),
      supabase.from("folha_pagamento").select("*").eq("mes", mes).eq("ano", ano),
    ]);
    setProfissionais(profs || []);
    setFolhas(folhasData || []);
    setLoading(false);
  }

  function abrirNovo() {
    setEditando(null);
    setProfSelecionado("");
    setForm({ valor_base: "", adiantamento: "0", desconto: "0", observacao: "" });
    setModalAberto(true);
  }

  function abrirEditar(folha: Folha) {
    setEditando(folha);
    setProfSelecionado(folha.profissional_id);
    setForm({
      valor_base: String(folha.valor_base),
      adiantamento: String(folha.adiantamento),
      desconto: String(folha.desconto),
      observacao: folha.observacao || "",
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!profSelecionado || !form.valor_base) return;
    setSalvando(true);
    const payload = {
      profissional_id: profSelecionado,
      mes, ano,
      valor_base: parseFloat(form.valor_base),
      adiantamento: parseFloat(form.adiantamento) || 0,
      desconto: parseFloat(form.desconto) || 0,
      observacao: form.observacao || null,
    };
    if (editando) {
      const { error } = await supabase.from("folha_pagamento").update(payload).eq("id", editando.id);
      if (error) mostrarFeedback("erro", error.message);
      else mostrarFeedback("sucesso", "Folha atualizada!");
    } else {
      const { error } = await supabase.from("folha_pagamento").insert(payload);
      if (error) mostrarFeedback("erro", error.message);
      else mostrarFeedback("sucesso", "Folha cadastrada!");
    }
    setSalvando(false);
    setModalAberto(false);
    carregarDados();
  }

  async function marcarPago(folha: Folha) {
    const { error } = await supabase.from("folha_pagamento").update({
      status: "pago",
      data_pagamento: new Date().toISOString().split("T")[0],
    }).eq("id", folha.id);
    if (!error) { mostrarFeedback("sucesso", "Pagamento confirmado!"); carregarDados(); }
  }

  async function excluir(id: string) {
    if (!confirm("Remover este lançamento?")) return;
    const { error } = await supabase.from("folha_pagamento").delete().eq("id", id);
    if (!error) { mostrarFeedback("sucesso", "Lançamento removido."); carregarDados(); }
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalBruto    = folhas.reduce((s, f) => s + Number(f.valor_base), 0);
  const totalDescontos = folhas.reduce((s, f) => s + Number(f.adiantamento) + Number(f.desconto), 0);
  const totalLiquido  = folhas.reduce((s, f) => s + Number(f.valor_final), 0);
  const totalPendente = folhas.filter(f => f.status === "pendente").reduce((s, f) => s + Number(f.valor_final), 0);

  const profsComFolha = new Set(folhas.map(f => f.profissional_id));
  const profsSemFolha = profissionais.filter(p => !profsComFolha.has(p.id));

  const folhasPendentes = folhas.filter(f => f.status === "pendente");
  const folhasPagas     = folhas.filter(f => f.status === "pago");

  function CardFolha({ folha }: { folha: Folha }) {
    const prof = profissionais.find(p => p.id === folha.profissional_id);
    return (
      <div className={`bg-white rounded-xl border p-4 ${folha.status === "pago" ? "border-emerald-200" : "border-slate-200"}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-sm shrink-0">
              {prof?.nome?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{prof?.nome || "—"}</p>
              <p className="text-xs text-slate-400">{prof?.especialidade || prof?.role}</p>
              {prof?.pix_key && (
                <p className="text-xs text-slate-400 mt-0.5">PIX: <span className="font-medium text-slate-600">{prof.pix_key}</span></p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-right">
              <p className="text-xs text-slate-400">Valor base</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(folha.valor_base)}</p>
            </div>
            {(folha.adiantamento > 0 || folha.desconto > 0) && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Descontos</p>
                <p className="text-sm font-semibold text-red-600">- {fmt(Number(folha.adiantamento) + Number(folha.desconto))}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-slate-400">Líquido</p>
              <p className="text-base font-bold text-blue-700">{fmt(folha.valor_final)}</p>
            </div>

            <div>
              {folha.status === "pago" ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                  <Check className="h-3 w-3" /> Pago
                  {folha.data_pagamento && <span className="ml-1 opacity-70">{new Date(folha.data_pagamento).toLocaleDateString("pt-BR")}</span>}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                  <Clock className="h-3 w-3" /> Pendente
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {folha.status === "pendente" && (
                <button onClick={() => marcarPago(folha)}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition">
                  Confirmar PIX
                </button>
              )}
              <button onClick={() => abrirEditar(folha)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => excluir(folha.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {folha.observacao && (
          <p className="mt-2 text-xs text-slate-400 border-t border-slate-100 pt-2">📝 {folha.observacao}</p>
        )}
      </div>
    );
  }

  function Secao({ titulo, folhasSecao, aberto, onToggle, corBadge }: {
    titulo: string; folhasSecao: Folha[]; aberto: boolean;
    onToggle: () => void; corBadge: string;
  }) {
    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <button onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition">
          <div className="flex items-center gap-3">
            {aberto ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            <span className="font-semibold text-slate-700 text-sm">{titulo}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${corBadge}`}>
              {folhasSecao.length}
            </span>
          </div>
          <span className="text-sm font-bold text-slate-600">
            {fmt(folhasSecao.reduce((s, f) => s + Number(f.valor_final), 0))}
          </span>
        </button>
        {aberto && (
          <div className="p-3 space-y-3 bg-white">
            {folhasSecao.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-4">Nenhum lançamento</p>
            ) : (
              folhasSecao.map(f => <CardFolha key={f.id} folha={f} />)
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            Folha de Pagamento
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie os pagamentos mensais dos profissionais</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" />
          Novo lançamento
        </button>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      {/* SELETOR MÊS/ANO */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-sm text-slate-400">{folhas.length} lançamento{folhas.length !== 1 ? "s" : ""}</span>
      </div>

      {/* CARDS RESUMO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Bruto",   valor: totalBruto,    cor: "text-slate-800" },
          { label: "Descontos",     valor: totalDescontos, cor: "text-red-600" },
          { label: "Total Líquido", valor: totalLiquido,  cor: "text-blue-700" },
          { label: "Pendente",      valor: totalPendente, cor: "text-orange-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{card.label}</p>
            <p className={`text-lg font-bold mt-1 ${card.cor}`}>{fmt(card.valor)}</p>
          </div>
        ))}
      </div>

      {/* ALERTA */}
      {profsSemFolha.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Profissionais sem lançamento em {MESES[mes-1]}:</p>
            <p className="text-sm text-amber-700 mt-1">{profsSemFolha.map(p => p.nome).join(", ")}</p>
          </div>
        </div>
      )}

      {/* LISTAS RETRÁTEIS */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : folhas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhum lançamento em {MESES[mes-1]} de {ano}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Secao
            titulo="Pendentes"
            folhasSecao={folhasPendentes}
            aberto={pendentesAberto}
            onToggle={() => setPendentesAberto(!pendentesAberto)}
            corBadge="bg-orange-100 text-orange-700"
          />
          <Secao
            titulo="Pagos"
            folhasSecao={folhasPagas}
            aberto={pagosAberto}
            onToggle={() => setPagosAberto(!pagosAberto)}
            corBadge="bg-emerald-100 text-emerald-700"
          />
        </div>
      )}

      {/* MODAL NOVO/EDITAR */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{editando ? "Editar lançamento" : "Novo lançamento"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Profissional</label>
                <select value={profSelecionado} onChange={(e) => setProfSelecionado(e.target.value)}
                  disabled={!!editando}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50">
                  <option value="">Selecione...</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} ({p.role === "especialista" ? "Especialista" : "AT"})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor base (R$)</label>
                <input type="number" min="0" step="0.01" placeholder="0,00" value={form.valor_base}
                  onChange={(e) => setForm({ ...form, valor_base: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Adiantamento (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.adiantamento}
                    onChange={(e) => setForm({ ...form, adiantamento: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Desconto (R$)</label>
                  <input type="number" min="0" step="0.01" value={form.desconto}
                    onChange={(e) => setForm({ ...form, desconto: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {form.valor_base && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-blue-700 font-medium">Valor líquido:</span>
                  <span className="text-lg font-bold text-blue-800">
                    {fmt(parseFloat(form.valor_base || "0") - parseFloat(form.adiantamento || "0") - parseFloat(form.desconto || "0"))}
                  </span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Observação</label>
                <input type="text" placeholder="Ex: Inclui horas extras..." value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !profSelecionado || !form.valor_base}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}