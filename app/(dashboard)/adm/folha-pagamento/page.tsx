"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { DollarSign, Check, Clock, Plus, Pencil, X, ChevronDown, ChevronRight, Trash2, Printer } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type Profissional = { id: string; nome: string; especialidade: string; role: string };
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
  const [presencas, setPresencas] = useState<Record<string, { P: number; F: number; FJ: number }>>({});
  const [loading, setLoading] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Folha | null>(null);
  const [profSelecionado, setProfSelecionado] = useState("");
  const [form, setForm] = useState({ valor_base: "", adiantamento: "0", desconto: "0", observacao: "" });
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [pendentesAberto, setPendentesAberto] = useState(true);
  const [pagosAberto, setPagosAberto] = useState(false);

  // confirmação de pagamento PIX
  const [confirmandoPagamento, setConfirmandoPagamento] = useState<Folha | null>(null);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  // confirmação de exclusão
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [deletandoLabel, setDeletandoLabel] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function getUsuarioLogado() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  useEffect(() => { carregarDados(); }, [mes, ano]);

  async function carregarDados() {
    setLoading(true);
    const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const fim = new Date(ano, mes, 0).toISOString().slice(0, 10);
    const [{ data: profs }, { data: folhasData }, { data: presencasData }] = await Promise.all([
      supabase.from("atendentes").select("id, nome, especialidade, role").order("nome"),
      supabase.from("folha_pagamento").select("*").eq("mes", mes).eq("ano", ano),
      supabase.from("atendimentos_especialista").select("especialista_id, status").gte("data", inicio).lte("data", fim),
    ]);
    setProfissionais(profs || []);
    setFolhas(folhasData || []);
    const resumo: Record<string, { P: number; F: number; FJ: number }> = {};
    (presencasData || []).forEach((p: { especialista_id: string; status: "P" | "F" | "FJ" }) => {
      if (!p.especialista_id) return;
      if (!resumo[p.especialista_id]) resumo[p.especialista_id] = { P: 0, F: 0, FJ: 0 };
      resumo[p.especialista_id][p.status] += 1;
    });
    setPresencas(resumo);
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
    const profNome = profissionais.find(p => p.id === profSelecionado)?.nome || "profissional";
    const user = await getUsuarioLogado();

    if (editando) {
      const { error } = await supabase.from("folha_pagamento").update(payload).eq("id", editando.id);
      if (error) mostrarFeedback("erro", error.message);
      else {
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Editou",
          tabela: "folha_pagamento",
          registro_id: editando.id,
          descricao: `Editou folha de ${profNome} — ${MESES[mes-1]}/${ano}`,
        });
        mostrarFeedback("sucesso", "Folha atualizada!");
      }
    } else {
      const { data: nova, error } = await supabase.from("folha_pagamento").insert(payload).select().single();
      if (error) mostrarFeedback("erro", error.message);
      else {
        await registrarLog(supabase, {
          usuario_email: user?.email || "desconhecido",
          acao: "Criou",
          tabela: "folha_pagamento",
          registro_id: nova?.id,
          descricao: `Lançou folha de ${profNome} — ${MESES[mes-1]}/${ano} — R$ ${parseFloat(form.valor_base).toFixed(2)}`,
        });
        mostrarFeedback("sucesso", "Folha cadastrada!");
      }
    }
    setSalvando(false);
    setModalAberto(false);
    carregarDados();
  }

  async function marcarPago() {
    if (!confirmandoPagamento) return;
    const folha = confirmandoPagamento;
    setProcessandoPagamento(true);
    const { error } = await supabase.from("folha_pagamento").update({
      status: "pago",
      data_pagamento: new Date().toISOString().split("T")[0],
    }).eq("id", folha.id);

    if (!error) {
      const user = await getUsuarioLogado();
      const profNome = profissionais.find(p => p.id === folha.profissional_id)?.nome || "profissional";
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Pagou",
        tabela: "folha_pagamento",
        registro_id: folha.id,
        descricao: `Confirmou pagamento de ${profNome} — ${MESES[mes-1]}/${ano} — ${fmt(folha.valor_final)}`,
      });
      mostrarFeedback("sucesso", "Pagamento confirmado!");
      carregarDados();
    }
    setConfirmandoPagamento(null);
    setProcessandoPagamento(false);
  }

  async function excluir() {
    if (!deletandoId) return;
    setExcluindo(true);
    const folha = folhas.find(f => f.id === deletandoId);
    const profNome = profissionais.find(p => p.id === folha?.profissional_id)?.nome || "profissional";
    const { error } = await supabase.from("folha_pagamento").delete().eq("id", deletandoId);
    if (!error) {
      const user = await getUsuarioLogado();
      await registrarLog(supabase, {
        usuario_email: user?.email || "desconhecido",
        acao: "Excluiu",
        tabela: "folha_pagamento",
        registro_id: deletandoId,
        descricao: `Removeu folha de ${profNome} — ${MESES[mes-1]}/${ano}`,
      });
      mostrarFeedback("sucesso", "Lançamento removido.");
      carregarDados();
    }
    setDeletandoId(null);
    setDeletandoLabel("");
    setExcluindo(false);
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalBruto     = folhas.reduce((s, f) => s + Number(f.valor_base), 0);
  const totalDescontos = folhas.reduce((s, f) => s + Number(f.adiantamento) + Number(f.desconto), 0);
  const totalLiquido   = folhas.reduce((s, f) => s + Number(f.valor_final), 0);
  const totalPendente  = folhas.filter(f => f.status === "pendente").reduce((s, f) => s + Number(f.valor_final), 0);

  const profsComFolha = new Set(folhas.map(f => f.profissional_id));
  const profsSemFolha = profissionais.filter(p => !profsComFolha.has(p.id));

  const folhasPendentes = folhas.filter(f => f.status === "pendente");
  const folhasPagas     = folhas.filter(f => f.status === "pago");

  function imprimirHolerite(folha: Folha) {
    const prof = profissionais.find(p => p.id === folha.profissional_id);
    const w = window.open("", "_blank");
    if (!w) return;
    const desconto = Number(folha.adiantamento) + Number(folha.desconto);
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Holerite — ${prof?.nome || ""} — ${MESES[folha.mes - 1]}/${folha.ano}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 40px; max-width: 680px; margin: auto; }
        .header { border-bottom: 2px solid #1e40af; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
        .clinica { font-size: 16px; font-weight: 700; color: #0f172a; }
        .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
        .badge { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .nome { font-size: 18px; font-weight: 700; margin: 16px 0 4px; }
        .cargo { font-size: 12px; color: #64748b; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .valor-pos { color: #15803d; font-weight: 600; }
        .valor-neg { color: #dc2626; font-weight: 600; }
        .total-row td { font-size: 15px; font-weight: 700; border-top: 2px solid #1e40af; border-bottom: none; padding-top: 12px; }
        .status { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .pago { background: #dcfce7; color: #15803d; }
        .pendente { background: #ffedd5; color: #c2410c; }
        .assinatura { margin-top: 48px; display: flex; justify-content: space-between; gap: 32px; }
        .assinatura-item { flex: 1; }
        .linha { border-bottom: 1px solid #94a3b8; margin-bottom: 6px; height: 32px; }
        .label { font-size: 10px; color: #64748b; }
        .rodape { font-size: 10px; color: #94a3b8; margin-top: 32px; text-align: right; }
        @media print { body { padding: 24px; } }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="clinica">Clínica Abraço</div>
          <div class="sub">Comprovante de Pagamento</div>
        </div>
        <div class="badge">${MESES[folha.mes - 1]} / ${folha.ano}</div>
      </div>
      <div class="nome">${prof?.nome || "—"}</div>
      <div class="cargo">${prof?.especialidade || prof?.role || "—"}</div>
      <table>
        <tr><th>Descrição</th><th>Valor</th></tr>
        <tr><td>Salário base</td><td class="valor-pos">${Number(folha.valor_base).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>
        ${folha.adiantamento > 0 ? `<tr><td>Adiantamento</td><td class="valor-neg">- ${Number(folha.adiantamento).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>` : ""}
        ${folha.desconto > 0 ? `<tr><td>Desconto</td><td class="valor-neg">- ${Number(folha.desconto).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>` : ""}
        <tr class="total-row"><td>Valor líquido</td><td>${Number(folha.valor_final).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>
      </table>
      <p>Status: <span class="status ${folha.status === "pago" ? "pago" : "pendente"}">${folha.status === "pago" ? "✓ Pago" : "⏳ Pendente"}</span>
      ${folha.data_pagamento ? ` &nbsp; Data: ${new Date(folha.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}</p>
      ${folha.observacao ? `<p style="margin-top:10px;font-size:12px;color:#64748b;">Obs: ${folha.observacao}</p>` : ""}
      <div class="assinatura">
        <div class="assinatura-item"><div class="linha"></div><div class="label">Assinatura do(a) colaborador(a)</div></div>
        <div class="assinatura-item"><div class="linha"></div><div class="label">Data de recebimento</div></div>
        <div class="assinatura-item"><div class="linha"></div><div class="label">Assinatura da gestão / ADM</div></div>
      </div>
      <div class="rodape">Impresso em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
      <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`);
    w.document.close();
  }

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
              {prof?.role === "especialista" && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  <span className="text-emerald-600 font-semibold">{presencas[prof.id]?.P ?? 0} presenças</span>
                  {" · "}
                  <span className="text-red-500">{presencas[prof.id]?.F ?? 0} faltas</span>
                  {" · "}
                  <span className="text-slate-400">{presencas[prof.id]?.FJ ?? 0} justificadas</span>
                  {" no mês"}
                </p>
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
                <button
                  onClick={() => setConfirmandoPagamento(folha)}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition">
                  Confirmar PIX
                </button>
              )}
              <button onClick={() => imprimirHolerite(folha)}
                title="Imprimir holerite"
                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                <Printer className="h-4 w-4" />
              </button>
              <button onClick={() => abrirEditar(folha)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const profNome = profissionais.find(p => p.id === folha.profissional_id)?.nome || "profissional";
                  setDeletandoId(folha.id);
                  setDeletandoLabel(`${profNome} — ${MESES[mes-1]}/${ano}`);
                }}
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Folha de Pagamento</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gerencie os pagamentos mensais dos profissionais</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" />
          Novo lançamento
        </button>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

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

      {profsSemFolha.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg">⚠️</span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800">Profissionais sem lançamento em {MESES[mes-1]}:</p>
            {profsSemFolha.map(p => (
              <p key={p.id} className="text-sm text-amber-700">
                {p.nome}
                {p.role === "especialista" && (
                  <span className="text-amber-600 font-medium">
                    {" — "}{presencas[p.id]?.P ?? 0} presenças · {presencas[p.id]?.F ?? 0} faltas · {presencas[p.id]?.FJ ?? 0} justificadas
                  </span>
                )}
              </p>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : folhas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhum lançamento em {MESES[mes-1]} de {ano}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Secao titulo="Pendentes" folhasSecao={folhasPendentes} aberto={pendentesAberto}
            onToggle={() => setPendentesAberto(!pendentesAberto)} corBadge="bg-orange-100 text-orange-700" />
          <Secao titulo="Pagos" folhasSecao={folhasPagas} aberto={pagosAberto}
            onToggle={() => setPagosAberto(!pagosAberto)} corBadge="bg-emerald-100 text-emerald-700" />
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE PAGAMENTO PIX */}
      {confirmandoPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Confirmar pagamento via PIX?</h3>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  {profissionais.find(p => p.id === confirmandoPagamento.profissional_id)?.nome}
                </p>
                <p className="text-xl font-bold text-emerald-700 mt-1">{fmt(confirmandoPagamento.valor_final)}</p>
                <p className="text-xs text-slate-400 mt-1">Esta ação marcará o pagamento como concluído e não poderá ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmandoPagamento(null)}
                disabled={processandoPagamento}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={marcarPago}
                disabled={processandoPagamento}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {processandoPagamento ? "Confirmando..." : "Sim, confirmar PIX"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Remover lançamento?</h3>
                <p className="text-sm text-slate-600 mt-1 font-medium">{deletandoLabel}</p>
                <p className="text-xs text-slate-400 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletandoId(null); setDeletandoLabel(""); }}
                disabled={excluindo}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={excluir}
                disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {excluindo ? "Removendo..." : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}

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