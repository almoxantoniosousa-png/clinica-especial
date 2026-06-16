"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { Package, ClipboardList, Trophy, ArrowDownToLine, Undo2, Plus, Trash2, Camera } from "lucide-react";
import { registrarLog } from "@/lib/auditoria";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type Emprestimo = {
  id: string;
  brinquedo_nome: string;
  solicitante_nome: string;
  solicitante_role: string;
  crianca_nome: string;
  status: "solicitado" | "retirado" | "devolvido";
  obs: string | null;
  data_solicitacao: string;
  data_retirada: string | null;
  data_devolucao: string | null;
};

type Brinquedo = { id: string; nome: string; foto_url: string | null };

const STATUS_CFG = {
  solicitado: { label: "Solicitado", cor: "bg-amber-50 text-amber-700 border-amber-200",        borda: "border-l-amber-400"   },
  retirado:   { label: "Retirado",   cor: "bg-blue-50 text-blue-700 border-blue-200",           borda: "border-l-blue-400"    },
  devolvido:  { label: "Devolvido",  cor: "bg-emerald-50 text-emerald-700 border-emerald-200",  borda: "border-l-emerald-400" },
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ABAS = ["Solicitações", "Em Posse", "Histórico", "Catálogo", "Ranking"] as const;
type Aba = typeof ABAS[number];

export default function BrinquedosAuxAdmPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("Solicitações");
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [brinquedos, setBrinquedos] = useState<Brinquedo[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [novoBrinquedo, setNovoBrinquedo] = useState("");
  const [salvandoCatalogo, setSalvandoCatalogo] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [catalogoExpandido, setCatalogoExpandido] = useState(false);
  const CATALOGO_LIMITE = 8;

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregar() {
    setLoading(true);
    const [{ data: emp }, { data: bri }] = await Promise.all([
      supabase.from("brinquedos_emprestimos").select("*").order("data_solicitacao", { ascending: false }),
      supabase.from("brinquedos").select("*").order("nome"),
    ]);
    setEmprestimos(emp || []);
    setBrinquedos(bri || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function registrarRetirada(id: string) {
    const { error } = await supabase
      .from("brinquedos_emprestimos")
      .update({ status: "retirado", data_retirada: new Date().toISOString() })
      .eq("id", id);
    if (error) { mostrarFeedback("erro", "Erro ao registrar retirada."); return; }
    const emp = emprestimos.find(e => e.id === id);
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Registrou retirada de brinquedo",
      tabela: "brinquedos_emprestimos",
      registro_id: id,
      descricao: `Brinquedo: ${emp?.brinquedo_nome || id} | Solicitante: ${emp?.solicitante_nome || ""} | Criança: ${emp?.crianca_nome || ""}`,
    });
    mostrarFeedback("sucesso", "Retirada registrada!");
    carregar();
  }

  async function registrarDevolucao(id: string) {
    const { error } = await supabase
      .from("brinquedos_emprestimos")
      .update({ status: "devolvido", data_devolucao: new Date().toISOString() })
      .eq("id", id);
    if (error) { mostrarFeedback("erro", "Erro ao registrar devolução."); return; }
    const emp = emprestimos.find(e => e.id === id);
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Registrou devolução de brinquedo",
      tabela: "brinquedos_emprestimos",
      registro_id: id,
      descricao: `Brinquedo: ${emp?.brinquedo_nome || id} | Solicitante: ${emp?.solicitante_nome || ""} | Criança: ${emp?.crianca_nome || ""}`,
    });
    mostrarFeedback("sucesso", "Devolução registrada!");
    carregar();
  }

  function selecionarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function adicionarAoCatalogo() {
    const nome = novoBrinquedo.trim();
    if (!nome) return;
    setSalvandoCatalogo(true);

    let foto_url: string | null = null;
    if (fotoFile) {
      const ext = fotoFile.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brinquedos-fotos").upload(path, fotoFile, { upsert: true });
      if (!upErr) {
        const { data } = supabase.storage.from("brinquedos-fotos").getPublicUrl(path);
        foto_url = data.publicUrl;
      }
    }

    const { data: novoCat, error } = await supabase.from("brinquedos").insert({ nome, foto_url }).select().single();
    setSalvandoCatalogo(false);
    if (error) { mostrarFeedback("erro", "Erro ou brinquedo já existe no catálogo."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Adicionou brinquedo ao catálogo",
      tabela: "brinquedos",
      registro_id: novoCat?.id,
      descricao: `Brinquedo: ${nome}${foto_url ? " (com foto)" : ""}`,
    });
    setNovoBrinquedo(""); setFotoFile(null); setFotoPreview(null);
    mostrarFeedback("sucesso", `"${nome}" adicionado ao catálogo.`);
    carregar();
  }

  async function excluirBrinquedo(id: string, nome: string) {
    const { error } = await supabase.from("brinquedos").delete().eq("id", id);
    if (error) { mostrarFeedback("erro", "Não foi possível excluir."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, {
      usuario_email: user?.email || "desconhecido",
      acao: "Removeu brinquedo do catálogo",
      tabela: "brinquedos",
      registro_id: id,
      descricao: `Brinquedo: ${nome}`,
    });
    mostrarFeedback("sucesso", `"${nome}" removido.`);
    carregar();
  }

  const solicitados = emprestimos.filter(e => e.status === "solicitado");
  const emPosse     = emprestimos.filter(e => e.status === "retirado");
  const historico   = emprestimos.filter(e => e.status === "devolvido");

  const rankingBrinquedos = Object.entries(
    emprestimos.reduce<Record<string, number>>((acc, e) => { acc[e.brinquedo_nome] = (acc[e.brinquedo_nome] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const rankingColaboradoras = Object.entries(
    emprestimos.reduce<Record<string, number>>((acc, e) => { acc[e.solicitante_nome] = (acc[e.solicitante_nome] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const rankingCriancas = Object.entries(
    emprestimos.reduce<Record<string, number>>((acc, e) => { acc[e.crianca_nome] = (acc[e.crianca_nome] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const inputClass = "w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-slate-800 text-sm focus:outline-none transition placeholder:text-slate-400 bg-white";

  const optBarH = {
    responsive: true, maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: { legend: { display: false }, tooltip: { cornerRadius: 8 } },
    scales: {
      x: { grid: { color: "#f1f5f9" }, ticks: { color: "#94a3b8", font: { size: 11 } }, beginAtZero: true },
      y: { grid: { display: false }, ticks: { color: "#475569", font: { size: 12 } } },
    },
  };

  const optPie = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { font: { size: 11 }, color: "#64748b", padding: 12 } }, tooltip: { cornerRadius: 8 } },
  };

  const coresBarra = ["#6366f1", "#10b981", "#f97316", "#3b82f6", "#ec4899"];
  const coresPizza = ["#6366f1", "#10b981", "#f97316", "#3b82f6", "#ec4899"];

  const chartBrinquedos = rankingBrinquedos.length > 0 ? {
    labels: rankingBrinquedos.map(([n]) => n),
    datasets: [{ data: rankingBrinquedos.map(([, v]) => v), backgroundColor: coresBarra, borderRadius: 6 }],
  } : null;

  const chartColaboradoras = rankingColaboradoras.length > 0 ? {
    labels: rankingColaboradoras.map(([n]) => n),
    datasets: [{ data: rankingColaboradoras.map(([, v]) => v), backgroundColor: "#6366f1", borderRadius: 6 }],
  } : null;

  const chartCriancas = rankingCriancas.length > 0 ? {
    labels: rankingCriancas.map(([n]) => n),
    datasets: [{ data: rankingCriancas.map(([, v]) => v), backgroundColor: coresPizza, hoverOffset: 8, borderWidth: 2, borderColor: "#fff" }],
  } : null;

  function CardEmprestimo({ e, acoes }: { e: Emprestimo; acoes?: React.ReactNode }) {
    const cfg = STATUS_CFG[e.status];
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${cfg.borda} shadow-sm p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">{e.brinquedo_nome}</p>
            <p className="text-xs text-slate-500">
              👤 {e.solicitante_nome}
              <span className="text-slate-300 mx-1">·</span>
              👶 {e.crianca_nome}
              <span className="text-slate-300 mx-1">·</span>
              <span className="capitalize text-slate-400">{e.solicitante_role}</span>
            </p>
            <p className="text-xs text-slate-400">Solicitado: {fmt(e.data_solicitacao)}</p>
            {e.data_retirada   && <p className="text-xs text-blue-500">Retirado: {fmt(e.data_retirada)}</p>}
            {e.data_devolucao  && <p className="text-xs text-emerald-500">Devolvido: {fmt(e.data_devolucao)}</p>}
            {e.obs && <p className="text-xs text-slate-500 italic mt-1">"{e.obs}"</p>}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${cfg.cor}`}>{cfg.label}</span>
            {acoes}
          </div>
        </div>
      </div>
    );
  }

  function GraficoCard({ titulo, emoji, children }: { titulo: string; emoji: string; children: React.ReactNode }) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="font-bold text-slate-700 mb-4">{emoji} {titulo}</p>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">

      <div>
        <h1 className="text-xl font-bold text-slate-900">Brinquedos</h1>
        <p className="text-xs text-slate-400 mt-0.5">Controle de solicitação, retirada e devolução</p>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
          feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {feedback.tipo === "sucesso" ? "✓" : "✕"} {feedback.msg}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-amber-600">{solicitados.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">Solicitações</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-blue-600">{emPosse.length}</p>
            <p className="text-xs text-blue-500 mt-0.5">Em Posse</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-emerald-600">{historico.length}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Devolvidos</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {ABAS.map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              aba === a ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {a}
            {a === "Solicitações" && solicitados.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{solicitados.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : (
        <>
          {aba === "Solicitações" && (
            <div className="space-y-3">
              {solicitados.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <ClipboardList className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhuma solicitação pendente.</p>
                </div>
              ) : solicitados.map(e => (
                <CardEmprestimo key={e.id} e={e} acoes={
                  <button onClick={() => registrarRetirada(e.id)}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition">
                    <ArrowDownToLine className="h-3.5 w-3.5" /> Retirada
                  </button>
                } />
              ))}
            </div>
          )}

          {aba === "Em Posse" && (
            <div className="space-y-3">
              {emPosse.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <Package className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhum brinquedo fora do estoque.</p>
                </div>
              ) : emPosse.map(e => (
                <CardEmprestimo key={e.id} e={e} acoes={
                  <button onClick={() => registrarDevolucao(e.id)}
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition">
                    <Undo2 className="h-3.5 w-3.5" /> Devolução
                  </button>
                } />
              ))}
            </div>
          )}

          {aba === "Histórico" && (
            <div className="space-y-3">
              {historico.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <p className="text-sm text-slate-400">Nenhum registro de devolução ainda.</p>
                </div>
              ) : historico.map(e => <CardEmprestimo key={e.id} e={e} />)}
            </div>
          )}

          {aba === "Catálogo" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adicionar ao catálogo</p>
                <div className="flex gap-2">
                  <input value={novoBrinquedo} onChange={e => setNovoBrinquedo(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && adicionarAoCatalogo()}
                    placeholder="Nome do brinquedo..." className={inputClass} />
                  <button onClick={adicionarAoCatalogo} disabled={!novoBrinquedo.trim() || salvandoCatalogo}
                    className="h-11 px-4 rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2 shadow-lg flex-shrink-0">
                    <Plus className="h-4 w-4" /> {salvandoCatalogo ? "Salvando..." : "Adicionar"}
                  </button>
                </div>
                {/* Foto opcional */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer h-9 px-3 rounded-xl border-2 border-slate-200 hover:border-blue-400 text-xs font-semibold text-slate-500 hover:text-blue-600 transition">
                    <Camera className="h-4 w-4" />
                    {fotoFile ? fotoFile.name : "Adicionar foto (opcional)"}
                    <input type="file" accept="image/*" className="hidden" onChange={selecionarFoto} />
                  </label>
                  {fotoPreview && (
                    <div className="relative">
                      <img src={fotoPreview} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      <button onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center leading-none">✕</button>
                    </div>
                  )}
                </div>
              </div>

              {brinquedos.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <Package className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Catálogo vazio. Adicione brinquedos ou eles aparecerão automaticamente com as solicitações.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Catálogo ({brinquedos.length} {brinquedos.length === 1 ? "item" : "itens"})
                    </p>
                    {brinquedos.length > CATALOGO_LIMITE && (
                      <button onClick={() => setCatalogoExpandido(v => !v)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
                        {catalogoExpandido ? "▲ Recolher" : `▼ Ver todos (${brinquedos.length})`}
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(catalogoExpandido ? brinquedos : brinquedos.slice(0, CATALOGO_LIMITE)).map(b => (
                      <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                        <div className="flex items-center gap-3">
                          {b.foto_url ? (
                            <img src={b.foto_url} alt={b.nome} className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-slate-800">{b.nome}</span>
                        </div>
                        <button onClick={() => excluirBrinquedo(b.id, b.nome)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {!catalogoExpandido && brinquedos.length > CATALOGO_LIMITE && (
                    <button onClick={() => setCatalogoExpandido(true)}
                      className="w-full py-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition border-t border-slate-100">
                      Ver mais {brinquedos.length - CATALOGO_LIMITE} itens...
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {aba === "Ranking" && (
            <div className="space-y-4">
              {emprestimos.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-slate-200">
                  <Trophy className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-400">Sem dados suficientes para o ranking ainda.</p>
                </div>
              ) : (
                <>
                  <GraficoCard titulo="Brinquedo mais solicitado" emoji="🧸">
                    {chartBrinquedos
                      ? <div style={{ height: Math.max(120, rankingBrinquedos.length * 44) }}><Bar data={chartBrinquedos} options={optBarH} /></div>
                      : <p className="text-xs text-slate-400">Sem dados.</p>}
                  </GraficoCard>

                  <GraficoCard titulo="Colaboradora que mais solicita" emoji="👤">
                    {chartColaboradoras
                      ? <div style={{ height: Math.max(120, rankingColaboradoras.length * 44) }}><Bar data={chartColaboradoras} options={optBarH} /></div>
                      : <p className="text-xs text-slate-400">Sem dados.</p>}
                  </GraficoCard>

                  <GraficoCard titulo="Criança que mais usa" emoji="👶">
                    {chartCriancas
                      ? <div style={{ height: 220 }}><Pie data={chartCriancas} options={optPie} /></div>
                      : <p className="text-xs text-slate-400">Sem dados.</p>}
                  </GraficoCard>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
