"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CATEGORIAS: { valor: string; label: string; cor: string }[] = [
  { valor: "clinica", label: "Clínica", cor: "sage" },
  { valor: "familia", label: "Família", cor: "rose" },
  { valor: "pessoal", label: "Pessoal", cor: "lilac" },
  { valor: "importante", label: "Importante", cor: "amber" },
];

const LEMBRETES = [
  { valor: "", label: "Sem lembrete" },
  { valor: "10", label: "10 minutos antes" },
  { valor: "30", label: "30 minutos antes" },
  { valor: "60", label: "1 hora antes" },
  { valor: "1440", label: "1 dia antes" },
];

type Compromisso = {
  id: string;
  data: string;
  hora: string | null;
  titulo: string;
  categoria: string;
  observacao: string | null;
  lembrete_minutos_antes: number | null;
};

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function inicioDaSemana(d: Date) {
  const dia = d.getDay(); // 0=domingo
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  const novo = new Date(d);
  novo.setDate(d.getDate() + deslocamento);
  return novo;
}
function periodo(hora: string | null): "Manhã" | "Tarde" | "Noite" | "Sem horário" {
  if (!hora) return "Sem horário";
  const h = Number(hora.split(":")[0]);
  if (h < 12) return "Manhã";
  if (h < 18) return "Tarde";
  return "Noite";
}

export default function AgendaPessoalPage() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [semanaBase, setSemanaBase] = useState(() => inicioDaSemana(new Date()));
  const [diaAtivo, setDiaAtivo] = useState(() => toISO(new Date()));
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Compromisso | null>(null);
  const [form, setForm] = useState({ data: toISO(new Date()), hora: "", titulo: "", categoria: "clinica", observacao: "", lembrete: "" });
  const [salvando, setSalvando] = useState(false);

  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const diasSemana = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaBase); d.setDate(semanaBase.getDate() + i); return toISO(d);
  }), [semanaBase]);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user?.email) return;
      setEmail(user.email);
      const { data: u } = await supabase.from("usuarios").select("nome").eq("email", user.email).maybeSingle();
      setNome(u?.nome?.split(" ")[0] || "");
    });
  }, []);

  async function carregar() {
    if (!email) return;
    setLoading(true);
    const { data } = await supabase.from("agenda_pessoal")
      .select("*").eq("usuario_email", email)
      .gte("data", diasSemana[0]).lte("data", diasSemana[6])
      .order("data").order("hora", { nullsFirst: false });
    setCompromissos((data || []) as Compromisso[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [email, semanaBase]);

  function abrirNovo(data?: string) {
    setEditando(null);
    setForm({ data: data || diaAtivo, hora: "", titulo: "", categoria: "clinica", observacao: "", lembrete: "" });
    setModalAberto(true);
  }

  function abrirEditar(c: Compromisso) {
    setEditando(c);
    setForm({
      data: c.data, hora: c.hora || "", titulo: c.titulo, categoria: c.categoria,
      observacao: c.observacao || "", lembrete: c.lembrete_minutos_antes ? String(c.lembrete_minutos_antes) : "",
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.data) { mostrarFeedback("erro", "Preencha ao menos data e título."); return; }
    setSalvando(true);
    const payload = {
      usuario_email: email,
      data: form.data,
      hora: form.hora || null,
      titulo: form.titulo.trim(),
      categoria: form.categoria,
      observacao: form.observacao.trim() || null,
      lembrete_minutos_antes: form.lembrete ? Number(form.lembrete) : null,
      lembrete_disparado: false,
    };
    const { error } = editando
      ? await supabase.from("agenda_pessoal").update(payload).eq("id", editando.id)
      : await supabase.from("agenda_pessoal").insert(payload);
    setSalvando(false);
    if (error) { mostrarFeedback("erro", error.message); return; }
    mostrarFeedback("sucesso", editando ? "Compromisso atualizado!" : "Compromisso adicionado!");
    setModalAberto(false);
    carregar();
  }

  async function excluir() {
    if (!deletandoId) return;
    setExcluindo(true);
    const { error } = await supabase.from("agenda_pessoal").delete().eq("id", deletandoId);
    setExcluindo(false);
    if (error) { mostrarFeedback("erro", "Não foi possível remover."); return; }
    setDeletandoId(null);
    carregar();
  }

  const compromissosDoDia = compromissos.filter(c => c.data === diaAtivo);
  const porPeriodo = useMemo(() => {
    const mapa = new Map<string, Compromisso[]>();
    compromissosDoDia.forEach(c => {
      const p = periodo(c.hora);
      if (!mapa.has(p)) mapa.set(p, []);
      mapa.get(p)!.push(c);
    });
    const ordem = ["Manhã", "Tarde", "Noite", "Sem horário"];
    return ordem.filter(p => mapa.has(p)).map(p => [p, mapa.get(p)!] as const);
  }, [compromissosDoDia]);

  const dataAtivaObj = new Date(diaAtivo + "T12:00:00");
  const diaSemanaLabel = dataAtivaObj.toLocaleDateString("pt-BR", { weekday: "long" });
  const mesLabel = MESES[new Date(diasSemana[0] + "T12:00:00").getMonth()];
  const anoLabel = new Date(diasSemana[0] + "T12:00:00").getFullYear();

  return (
    <div className="min-h-screen -m-4 md:-m-8 p-4 md:p-8" style={{ background: "#d9d6d0" }}>
      <div className="max-w-5xl mx-auto space-y-5" style={{ fontFamily: "-apple-system,'Segoe UI',Arial,sans-serif" }}>

        {feedback && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            {feedback.tipo === "sucesso" ? "✓" : "✕"} {feedback.msg}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#cdc9c1] shadow-sm overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-7 py-6 border-b border-[#e4e0d9]">
            <div>
              <span className="text-[10.5px] tracking-[0.16em] uppercase text-[#98938b] block mb-1">🗓️ Minha Agenda</span>
              <h1 className="capitalize" style={{ fontFamily: "Georgia,'Palatino Linotype',serif", fontSize: 22, color: "#2c2a27" }}>{diaSemanaLabel}, {dataAtivaObj.getDate()}</h1>
              <p className="italic mt-1.5" style={{ fontFamily: "Georgia,serif", fontSize: 13.5, color: "#c48a92" }}>
                {nome ? `Olá, ${nome} — o que vamos agendar hoje?` : "O que vamos agendar hoje?"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="italic text-sm text-[#6f6b65]" style={{ fontFamily: "Georgia,serif" }}>{mesLabel} de {anoLabel}</span>
              <button onClick={() => abrirNovo()} className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: "#2c2a27" }}>
                + Novo compromisso
              </button>
            </div>
          </div>

          {/* Semana */}
          <div className="grid grid-cols-7 gap-px bg-[#ece9e4] border-b border-[#e4e0d9]">
            {diasSemana.map((d, i) => {
              const dObj = new Date(d + "T12:00:00");
              const ativo = d === diaAtivo;
              const doDia = compromissos.filter(c => c.data === d);
              const categoriasUnicas = Array.from(new Set(doDia.map(c => c.categoria)));
              return (
                <button key={d} onClick={() => setDiaAtivo(d)} className="bg-white py-3.5 px-1 text-center relative" style={ativo ? { background: "#fbfaf8" } : {}}>
                  <span className="block text-[10px] tracking-wider uppercase text-[#98938b] mb-1.5">{DIAS[i].slice(0, 3)}</span>
                  <span style={{ fontFamily: "Georgia,serif", fontSize: 18, color: ativo ? "#c48a92" : "#2c2a27" }}>{dObj.getDate()}</span>
                  <div className="flex justify-center gap-1 mt-1.5 h-1.5">
                    {categoriasUnicas.map(cat => {
                      const c = CATEGORIAS.find(x => x.valor === cat);
                      const cores: Record<string, string> = { sage: "#7f9678", rose: "#c48a92", lilac: "#93839f", amber: "#bd8a3f" };
                      return <span key={cat} className="w-1.5 h-1.5 rounded-full" style={{ background: cores[c?.cor || "sage"] }} />;
                    })}
                  </div>
                  {ativo && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-7 h-0.5 rounded-full" style={{ background: "#c48a92" }} />}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between px-7 pt-3">
            <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() - 7); setSemanaBase(d); }} className="text-xs text-[#98938b] hover:text-[#2c2a27] transition">‹ Semana anterior</button>
            <button onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() + 7); setSemanaBase(d); }} className="text-xs text-[#98938b] hover:text-[#2c2a27] transition">Próxima semana ›</button>
          </div>

          {/* Detalhe do dia */}
          <div className="px-7 py-6">
            {loading ? (
              <div className="text-center py-10 text-sm text-[#98938b]">Carregando...</div>
            ) : compromissosDoDia.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-4xl opacity-40">🗓️</span>
                <p className="text-sm text-[#98938b] mt-2">Nenhum compromisso neste dia.</p>
                <button onClick={() => abrirNovo(diaAtivo)} className="text-xs font-semibold mt-2" style={{ color: "#c48a92" }}>+ Adicionar um</button>
              </div>
            ) : (
              porPeriodo.map(([p, items]) => (
                <div key={p} className="mb-5 last:mb-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-[10.5px] tracking-[0.12em] uppercase text-[#98938b]">{p}</span>
                    <span className="flex-1 h-px bg-[#e4e0d9]" />
                  </div>
                  {items.map(c => {
                    const cat = CATEGORIAS.find(x => x.valor === c.categoria)!;
                    const cores: Record<string, { rail: string; tagBg: string; tagText: string }> = {
                      sage:  { rail: "#7f9678", tagBg: "#e9efe5", tagText: "#7f9678" },
                      rose:  { rail: "#c48a92", tagBg: "#f6e9ea", tagText: "#c48a92" },
                      lilac: { rail: "#93839f", tagBg: "#ece7f0", tagText: "#93839f" },
                      amber: { rail: "#bd8a3f", tagBg: "#f5ecdc", tagText: "#bd8a3f" },
                    };
                    const cor = cores[cat.cor];
                    return (
                      <div key={c.id} onClick={() => abrirEditar(c)} className="grid gap-4 items-start py-3 px-1 rounded-xl cursor-pointer hover:bg-[#ece9e4]/60 transition" style={{ gridTemplateColumns: "52px 3px 1fr auto" }}>
                        <span className="text-right pt-0.5 text-[12.5px] text-[#6f6b65]" style={{ fontVariantNumeric: "tabular-nums" }}>{c.hora || ""}</span>
                        <span className="self-stretch rounded" style={{ background: cor.rail }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14.5px] font-semibold text-[#2c2a27]">{c.titulo}</span>
                            <span className="text-[10px] tracking-wide uppercase font-semibold px-2 py-0.5 rounded-full" style={{ background: cor.tagBg, color: cor.tagText }}>{cat.label}</span>
                            {c.lembrete_minutos_antes ? <span className="text-[10px] text-[#98938b]">🔔</span> : null}
                          </div>
                          {c.observacao && <p className="text-[12.5px] text-[#6f6b65] mt-0.5">{c.observacao}</p>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setDeletandoId(c.id); }} className="text-[#98938b] hover:text-red-500 transition text-sm px-1">✕</button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 px-7 py-4 border-t border-[#e4e0d9]">
            {CATEGORIAS.map(cat => {
              const cores: Record<string, string> = { sage: "#7f9678", rose: "#c48a92", lilac: "#93839f", amber: "#bd8a3f" };
              return (
                <span key={cat.valor} className="flex items-center gap-1.5 text-xs text-[#6f6b65]">
                  <span className="w-2 h-2 rounded-full" style={{ background: cores[cat.cor] }} />{cat.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL NOVO/EDITAR */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: "#2c2a27" }}>
              <h2 className="font-bold text-white">{editando ? "Editar compromisso" : "Novo compromisso"}</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Horário (opcional)</label>
                  <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Reunião com fornecedor, cabeleireiro..." className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map(cat => (
                    <button key={cat.valor} type="button" onClick={() => setForm(f => ({ ...f, categoria: cat.valor }))}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${form.categoria === cat.valor ? "text-white" : "text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                      style={form.categoria === cat.valor ? { background: "#2c2a27", borderColor: "#2c2a27" } : {}}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observação (opcional)</label>
                <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">🔔 Lembrete</label>
                <select value={form.lembrete} onChange={e => setForm(f => ({ ...f, lembrete: e.target.value }))} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400">
                  {LEMBRETES.map(l => <option key={l.valor} value={l.valor}>{l.label}</option>)}
                </select>
                {form.lembrete && !form.hora && <p className="text-[11px] text-amber-600 mt-1">Defina um horário para o lembrete funcionar.</p>}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setModalAberto(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex-1 h-11 rounded-xl text-white text-sm font-bold transition disabled:opacity-50" style={{ background: "#c48a92" }}>{salvando ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">🗑️</div>
              <h3 className="font-bold text-slate-800">Remover compromisso?</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} disabled={excluindo} className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">Cancelar</button>
              <button onClick={excluir} disabled={excluindo} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">{excluindo ? "Removendo..." : "Sim, remover"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
