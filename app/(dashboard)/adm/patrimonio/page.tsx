"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabaseClient";
import { registrarLog } from "@/lib/auditoria";

type Patrimonio = {
  id: string;
  numero_tombamento: number;
  nome: string;
  categoria: string;
  categoria_detalhe: string | null;
  local: string | null;
  data_aquisicao: string | null;
  valor_aquisicao: number | null;
  fornecedor: string | null;
  nota_fiscal_url: string | null;
  estado_conservacao: string | null;
  responsavel: string | null;
  status: "ativo" | "em_manutencao" | "baixado";
  motivo_baixa: string | null;
  foto_url: string | null;
  observacoes: string | null;
  ultima_conferencia_inventario: string | null;
  created_at: string;
};

type Manutencao = {
  id: string;
  patrimonio_id: string;
  defeito_relatado: string;
  relatado_por_nome: string | null;
  relatado_por_email: string | null;
  data: string;
  local_conserto: string | null;
  tecnico_fornecedor: string | null;
  tecnico_contato: string | null;
  custo: number | null;
  nota_fiscal_url: string | null;
  garantia_ate: string | null;
  status: "aberto" | "em_analise" | "em_conserto" | "concluido" | "baixado";
  acao_tomada: string | null;
  contas_pagar_id: string | null;
  created_at: string;
  concluido_em: string | null;
};

const CATEGORIAS = ["Eletrônico", "Informática", "Mobiliário", "Equipamento Clínico/Terapêutico", "Material Pedagógico", "Eletrodoméstico", "Outro"];
const ESTADOS = ["Novo", "Bom", "Regular", "Ruim"];

const STATUS_BEM_CFG: Record<string, { label: string; cor: string }> = {
  ativo: { label: "Ativo", cor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  em_manutencao: { label: "Em manutenção", cor: "bg-amber-50 text-amber-700 border-amber-200" },
  baixado: { label: "Baixado", cor: "bg-slate-100 text-slate-500 border-slate-200" },
};

const STATUS_MANUT_CFG: Record<string, { label: string; cor: string }> = {
  aberto: { label: "Aberto", cor: "bg-red-50 text-red-700 border-red-200" },
  em_analise: { label: "Em análise", cor: "bg-amber-50 text-amber-700 border-amber-200" },
  em_conserto: { label: "Em conserto", cor: "bg-blue-50 text-blue-700 border-blue-200" },
  concluido: { label: "Concluído", cor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  baixado: { label: "Baixado (sem conserto)", cor: "bg-slate-100 text-slate-500 border-slate-200" },
};

const FORM_BEM_VAZIO = {
  nome: "", categoria: "", categoria_detalhe: "", local: "", data_aquisicao: "",
  valor_aquisicao: "", fornecedor: "", estado_conservacao: "", responsavel: "", observacoes: "",
};

function fmtData(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}
function fmtMoeda(v: number | null) {
  if (v == null) return "—";
  return `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function PatrimonioPage() {
  const [aba, setAba] = useState<"bens" | "manutencoes">("bens");
  const [bens, setBens] = useState<Patrimonio[]>([]);
  const [manutencoesPorBem, setManutencoesPorBem] = useState<Record<string, Manutencao[]>>({});
  const [manutencoes, setManutencoes] = useState<(Manutencao & { patrimonio?: { nome: string; numero_tombamento: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [souAdm, setSouAdm] = useState(false);

  const [busca, setBusca] = useState("");
  const [filtroStatusBem, setFiltroStatusBem] = useState<string>("todos");
  const [filtroStatusManut, setFiltroStatusManut] = useState<string>("todos");

  const [modalCadastro, setModalCadastro] = useState(false);
  const [salvandoBem, setSalvandoBem] = useState(false);
  const [formBem, setFormBem] = useState(FORM_BEM_VAZIO);
  const [editandoBem, setEditandoBem] = useState<Patrimonio | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [notaFiscalFile, setNotaFiscalFile] = useState<File | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const inputNotaRef = useRef<HTMLInputElement>(null);

  const [detalheBem, setDetalheBem] = useState<Patrimonio | null>(null);
  const [baixandoBem, setBaixandoBem] = useState<Patrimonio | null>(null);
  const [motivoBaixa, setMotivoBaixa] = useState("");
  const [processandoBaixa, setProcessandoBaixa] = useState(false);

  const [detalheManut, setDetalheManut] = useState<Manutencao | null>(null);
  const [formManut, setFormManut] = useState<any>({});
  const [salvandoManut, setSalvandoManut] = useState(false);
  const [notaManutFile, setNotaManutFile] = useState<File | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregar() {
    setLoading(true);
    const [{ data: usuario }, { data: bensData }, { data: manutData }] = await Promise.all([
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return { data: null };
        const { data } = await supabase.from("usuarios").select("role").eq("email", user.email).maybeSingle();
        return { data };
      }),
      supabase.from("patrimonio").select("*").order("numero_tombamento", { ascending: false }),
      supabase.from("manutencoes_equipamentos").select("*, patrimonio(nome, numero_tombamento)").order("created_at", { ascending: false }),
    ]);
    const role = usuario?.role?.toString().trim().toLowerCase();
    setSouAdm(role === "adm" || role === "admin");
    setBens(bensData || []);
    setManutencoes((manutData as any) || []);
    const agrupado: Record<string, Manutencao[]> = {};
    (manutData || []).forEach((m: any) => {
      if (!agrupado[m.patrimonio_id]) agrupado[m.patrimonio_id] = [];
      agrupado[m.patrimonio_id].push(m);
    });
    setManutencoesPorBem(agrupado);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function uploadArquivo(file: File, pasta: string) {
    const ext = file.name.split(".").pop();
    const path = `${pasta}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("patrimonio-arquivos").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("patrimonio-arquivos").getPublicUrl(path);
    return data.publicUrl;
  }

  function abrirCadastro() {
    setEditandoBem(null);
    setFormBem(FORM_BEM_VAZIO);
    setFotoFile(null); setFotoPreview(null); setNotaFiscalFile(null);
    setModalCadastro(true);
  }

  function abrirEdicao(bem: Patrimonio) {
    setEditandoBem(bem);
    setFormBem({
      nome: bem.nome, categoria: bem.categoria, categoria_detalhe: bem.categoria_detalhe || "",
      local: bem.local || "", data_aquisicao: bem.data_aquisicao || "",
      valor_aquisicao: bem.valor_aquisicao?.toString() || "", fornecedor: bem.fornecedor || "",
      estado_conservacao: bem.estado_conservacao || "", responsavel: bem.responsavel || "", observacoes: bem.observacoes || "",
    });
    setFotoFile(null); setFotoPreview(bem.foto_url); setNotaFiscalFile(null);
    setModalCadastro(true);
    setDetalheBem(null);
  }

  async function salvarBem() {
    if (!formBem.nome || !formBem.categoria) { mostrarFeedback("erro", "Preencha ao menos nome e categoria."); return; }
    setSalvandoBem(true);
    let foto_url = editandoBem?.foto_url || null;
    let nota_fiscal_url = editandoBem?.nota_fiscal_url || null;
    if (fotoFile) { const url = await uploadArquivo(fotoFile, "fotos"); if (url) foto_url = url; }
    if (notaFiscalFile) { const url = await uploadArquivo(notaFiscalFile, "notas-fiscais"); if (url) nota_fiscal_url = url; }

    const payload = {
      nome: formBem.nome,
      categoria: formBem.categoria,
      categoria_detalhe: formBem.categoria === "Outro" ? (formBem.categoria_detalhe || null) : null,
      local: formBem.local || null,
      data_aquisicao: formBem.data_aquisicao || null,
      valor_aquisicao: formBem.valor_aquisicao ? Number(formBem.valor_aquisicao) : null,
      fornecedor: formBem.fornecedor || null,
      estado_conservacao: formBem.estado_conservacao || null,
      responsavel: formBem.responsavel || null,
      observacoes: formBem.observacoes || null,
      foto_url, nota_fiscal_url,
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (editandoBem) {
      const { error } = await supabase.from("patrimonio").update(payload).eq("id", editandoBem.id);
      setSalvandoBem(false);
      if (error) { mostrarFeedback("erro", error.message); return; }
      await registrarLog(supabase, { usuario_email: user?.email || "desconhecido", acao: "Editou bem patrimonial", tabela: "patrimonio", registro_id: editandoBem.id, descricao: `Editou: ${formBem.nome}` });
      mostrarFeedback("sucesso", "Bem atualizado!");
    } else {
      const { data: novo, error } = await supabase.from("patrimonio").insert(payload).select().single();
      setSalvandoBem(false);
      if (error) { mostrarFeedback("erro", error.message); return; }
      await registrarLog(supabase, { usuario_email: user?.email || "desconhecido", acao: "Cadastrou bem patrimonial", tabela: "patrimonio", registro_id: novo?.id, descricao: `Cadastrou: ${formBem.nome} (${formBem.categoria})` });
      mostrarFeedback("sucesso", "Bem cadastrado!");
    }
    setModalCadastro(false);
    carregar();
  }

  async function confirmarBaixa() {
    if (!baixandoBem) return;
    setProcessandoBaixa(true);
    const { error } = await supabase.from("patrimonio").update({ status: "baixado", motivo_baixa: motivoBaixa || null }).eq("id", baixandoBem.id);
    setProcessandoBaixa(false);
    if (error) { mostrarFeedback("erro", error.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, { usuario_email: user?.email || "desconhecido", acao: "Deu baixa em bem patrimonial", tabela: "patrimonio", registro_id: baixandoBem.id, descricao: `Baixou: ${baixandoBem.nome} — motivo: ${motivoBaixa || "não informado"}` });
    mostrarFeedback("sucesso", "Baixa registrada.");
    setBaixandoBem(null); setMotivoBaixa(""); setDetalheBem(null);
    carregar();
  }

  function abrirDetalheManut(m: Manutencao) {
    setDetalheManut(m);
    setFormManut({
      local_conserto: m.local_conserto || "", tecnico_fornecedor: m.tecnico_fornecedor || "",
      tecnico_contato: m.tecnico_contato || "", custo: m.custo?.toString() || "",
      garantia_ate: m.garantia_ate || "", status: m.status, acao_tomada: m.acao_tomada || "",
    });
    setNotaManutFile(null);
  }

  async function salvarManutencao() {
    if (!detalheManut) return;
    setSalvandoManut(true);
    let nota_fiscal_url = detalheManut.nota_fiscal_url;
    if (notaManutFile) { const url = await uploadArquivo(notaManutFile, "manutencoes"); if (url) nota_fiscal_url = url; }

    const custoNum = formManut.custo ? Number(formManut.custo) : null;
    const payload: any = {
      local_conserto: formManut.local_conserto || null,
      tecnico_fornecedor: formManut.tecnico_fornecedor || null,
      tecnico_contato: formManut.tecnico_contato || null,
      custo: custoNum,
      garantia_ate: formManut.garantia_ate || null,
      status: formManut.status,
      acao_tomada: formManut.acao_tomada || null,
      nota_fiscal_url,
    };
    if (formManut.status === "concluido" && detalheManut.status !== "concluido") payload.concluido_em = new Date().toISOString();

    // Integração com Financeiro: gera conta a pagar automaticamente quando um custo é informado
    let contasPagarId = detalheManut.contas_pagar_id;
    if (custoNum && custoNum > 0 && !contasPagarId) {
      const bem = bens.find(b => b.id === detalheManut.patrimonio_id);
      const { data: conta, error: erroConta } = await supabase.from("contas_pagar").insert({
        descricao: `Manutenção: ${bem?.nome || "equipamento"} — ${detalheManut.defeito_relatado.slice(0, 80)}`,
        categoria: "Manutenção de Equipamentos",
        valor: custoNum,
        vencimento: new Date().toISOString().slice(0, 10),
        status: "pendente",
        observacao: `Gerado automaticamente a partir do chamado de manutenção.`,
      }).select().single();
      if (!erroConta && conta) { contasPagarId = conta.id; payload.contas_pagar_id = conta.id; }
    }

    const { error } = await supabase.from("manutencoes_equipamentos").update(payload).eq("id", detalheManut.id);
    setSalvandoManut(false);
    if (error) { mostrarFeedback("erro", error.message); return; }

    // Reflete o status no bem: em conserto -> bem fica "em_manutencao"; concluído/baixado -> bem volta a "ativo" (se não estava baixado)
    const bemAtual = bens.find(b => b.id === detalheManut.patrimonio_id);
    if (bemAtual && bemAtual.status !== "baixado") {
      const novoStatusBem = formManut.status === "em_conserto" || formManut.status === "em_analise" ? "em_manutencao" : "ativo";
      await supabase.from("patrimonio").update({ status: novoStatusBem }).eq("id", bemAtual.id);
    }

    const { data: { user } } = await supabase.auth.getUser();
    await registrarLog(supabase, { usuario_email: user?.email || "desconhecido", acao: "Atualizou chamado de manutenção", tabela: "manutencoes_equipamentos", registro_id: detalheManut.id, descricao: `Status: ${formManut.status}${contasPagarId ? " · lançado no Financeiro" : ""}` });
    mostrarFeedback("sucesso", "Manutenção atualizada!");
    setDetalheManut(null);
    carregar();
  }

  async function gerarEtiqueta(bem: Patrimonio) {
    const url = `${window.location.origin}/patrimonio/${bem.id}/reportar-defeito`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (v: string) => (v ?? "").toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const tombo = `T-${bem.numero_tombamento.toString().padStart(4, "0")}`;
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"/>
      <title>Etiqueta — ${esc(bem.nome)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; background: #f1f5f9; }
        .barra { text-align: center; margin-bottom: 24px; }
        .barra button { font-size: 13px; font-weight: bold; padding: 10px 20px; border-radius: 8px; border: none; background: #1e3a5f; color: white; cursor: pointer; }
        .etiqueta { width: 260px; margin: 0 auto; background: white; border: 2px solid #1e3a5f; border-radius: 12px; padding: 16px; text-align: center; }
        .etiqueta img.logo { width: 36px; height: 36px; object-fit: contain; margin-bottom: 4px; }
        .etiqueta .clinica { font-size: 11px; font-weight: bold; color: #1e3a5f; }
        .etiqueta .tombo { font-size: 18px; font-weight: 900; color: #1e3a5f; margin: 6px 0; }
        .etiqueta .nome { font-size: 12px; color: #334155; margin-bottom: 8px; }
        .etiqueta img.qr { width: 140px; height: 140px; }
        .etiqueta .dica { font-size: 9px; color: #94a3b8; margin-top: 6px; }
        @media print { .barra { display: none; } body { background: white; padding: 0; } }
      </style>
    </head><body>
      <div class="barra"><button onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button></div>
      <div class="etiqueta">
        <img class="logo" src="${window.location.origin}/logo.png" alt=""/>
        <p class="clinica">CLÍNICA ABRAÇO</p>
        <p class="tombo">${tombo}</p>
        <p class="nome">${esc(bem.nome)}</p>
        <img class="qr" src="${qrDataUrl}" alt="QR Code"/>
        <p class="dica">Aponte a câmera do celular para reportar um defeito</p>
      </div>
    </body></html>`);
    w.document.close();
  }

  const bensFiltrados = useMemo(() => {
    return bens.filter(b => {
      if (filtroStatusBem !== "todos" && b.status !== filtroStatusBem) return false;
      if (busca && !b.nome.toLowerCase().includes(busca.toLowerCase()) && !b.categoria.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [bens, filtroStatusBem, busca]);

  const manutencoesFiltradas = useMemo(() => {
    return manutencoes.filter(m => filtroStatusManut === "todos" || m.status === filtroStatusManut);
  }, [manutencoes, filtroStatusManut]);

  const custoAcumulado = (bemId: string) => (manutencoesPorBem[bemId] || []).reduce((acc, m) => acc + Number(m.custo || 0), 0);

  const seisM = 1000 * 60 * 60 * 24 * 180;
  const pendentesInventario = bens.filter(b => b.status !== "baixado" && (!b.ultima_conferencia_inventario || (Date.now() - new Date(b.ultima_conferencia_inventario).getTime()) > seisM));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Inventário &amp; Manutenção de Equipamentos</h1>
        <p className="text-xs text-slate-400 mt-0.5">Tombamento de bens e histórico de manutenção</p>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {feedback.tipo === "sucesso" ? "✓" : "✕"} {feedback.msg}
        </div>
      )}

      {!loading && pendentesInventario.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border bg-amber-50 border-amber-200 text-amber-800">
          ⏰ {pendentesInventario.length} bem{pendentesInventario.length !== 1 ? "ns" : ""} sem conferência de inventário há mais de 6 meses.
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["bens", "manutencoes"] as const).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${aba === a ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {a === "bens" ? "📦 Bens" : "🔧 Manutenções"}
            {a === "manutencoes" && manutencoes.filter(m => m.status === "aberto").length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{manutencoes.filter(m => m.status === "aberto").length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : aba === "bens" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou categoria..."
                className="h-9 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"/>
              <select value={filtroStatusBem} onChange={e => setFiltroStatusBem(e.target.value)} className="h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                <option value="todos">Todos os status</option>
                <option value="ativo">Ativo</option>
                <option value="em_manutencao">Em manutenção</option>
                <option value="baixado">Baixado</option>
              </select>
            </div>
            <button onClick={abrirCadastro} className="h-9 px-4 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition">+ Cadastrar bem</button>
          </div>

          {bensFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><span className="text-5xl">📦</span><p className="text-sm text-slate-400 mt-2">Nenhum bem cadastrado ainda.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bensFiltrados.map(b => (
                <div key={b.id} onClick={() => setDetalheBem(b)} className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition">
                  <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden">
                    {b.foto_url ? <img src={b.foto_url} alt="" className="w-full h-full object-cover"/> : <span className="text-4xl opacity-40">📦</span>}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800 text-sm truncate">{b.nome}</p>
                      <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">T-{b.numero_tombamento.toString().padStart(4, "0")}</span>
                    </div>
                    <p className="text-xs text-slate-400">{b.categoria}{b.local ? ` · ${b.local}` : ""}</p>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BEM_CFG[b.status].cor}`}>{STATUS_BEM_CFG[b.status].label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <select value={filtroStatusManut} onChange={e => setFiltroStatusManut(e.target.value)} className="h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white">
            <option value="todos">Todos os status</option>
            {Object.entries(STATUS_MANUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {manutencoesFiltradas.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200"><span className="text-5xl">🔧</span><p className="text-sm text-slate-400 mt-2">Nenhum chamado de manutenção.</p></div>
          ) : (
            <div className="space-y-3">
              {manutencoesFiltradas.map(m => (
                <div key={m.id} onClick={() => abrirDetalheManut(m)} className="bg-white rounded-2xl border border-slate-200 p-4 border-l-4 border-l-blue-400 cursor-pointer hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{m.patrimonio?.nome || "Equipamento"} <span className="text-xs text-slate-400 font-normal">T-{m.patrimonio?.numero_tombamento?.toString().padStart(4, "0")}</span></p>
                      <p className="text-xs text-slate-500 mt-1">{m.defeito_relatado}</p>
                      <p className="text-xs text-slate-400 mt-1">Relatado por {m.relatado_por_nome || "—"} · {fmtData(m.data)}{m.custo ? ` · ${fmtMoeda(m.custo)}` : ""}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_MANUT_CFG[m.status].cor}`}>{STATUS_MANUT_CFG[m.status].label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CADASTRO/EDIÇÃO DE BEM */}
      {modalCadastro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) setModalCadastro(false); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">{editandoBem ? "✏️ Editar bem" : "📦 Cadastrar bem"}</h2>
              <button onClick={() => setModalCadastro(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome *</label>
                <input value={formBem.nome} onChange={e => setFormBem(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Notebook Dell, Mesa de atendimento..." className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Categoria *</label>
                  <select value={formBem.categoria} onChange={e => setFormBem(f => ({ ...f, categoria: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-white">
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado</label>
                  <select value={formBem.estado_conservacao} onChange={e => setFormBem(f => ({ ...f, estado_conservacao: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-white">
                    <option value="">Selecione...</option>
                    {ESTADOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {formBem.categoria === "Outro" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Qual categoria?</label>
                  <input value={formBem.categoria_detalhe} onChange={e => setFormBem(f => ({ ...f, categoria_detalhe: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Local/Setor</label>
                  <input value={formBem.local} onChange={e => setFormBem(f => ({ ...f, local: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Responsável</label>
                  <input value={formBem.responsavel} onChange={e => setFormBem(f => ({ ...f, responsavel: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data de aquisição</label>
                  <input type="date" value={formBem.data_aquisicao} onChange={e => setFormBem(f => ({ ...f, data_aquisicao: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Valor de aquisição</label>
                  <input type="number" step="0.01" value={formBem.valor_aquisicao} onChange={e => setFormBem(f => ({ ...f, valor_aquisicao: e.target.value }))} placeholder="0,00" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fornecedor</label>
                <input value={formBem.fornecedor} onChange={e => setFormBem(f => ({ ...f, fornecedor: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Foto</label>
                  <div onClick={() => inputFotoRef.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 hover:bg-blue-50 transition">
                    {fotoPreview ? <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover"/> : <span className="text-2xl">📷</span>}
                  </div>
                  <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); } }}/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nota fiscal</label>
                  <div onClick={() => inputNotaRef.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50 transition text-center px-2">
                    <span className="text-xs text-slate-400">{notaFiscalFile ? notaFiscalFile.name : "📎 Anexar arquivo"}</span>
                  </div>
                  <input ref={inputNotaRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setNotaFiscalFile(f); }}/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Observações</label>
                <textarea value={formBem.observacoes} onChange={e => setFormBem(f => ({ ...f, observacoes: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setModalCadastro(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={salvarBem} disabled={salvandoBem} className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">{salvandoBem ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHE DO BEM */}
      {detalheBem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) setDetalheBem(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white">{detalheBem.nome}</h2>
                <p className="text-blue-200 text-xs">T-{detalheBem.numero_tombamento.toString().padStart(4, "0")} · {detalheBem.categoria}</p>
              </div>
              <button onClick={() => setDetalheBem(null)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_BEM_CFG[detalheBem.status].cor}`}>{STATUS_BEM_CFG[detalheBem.status].label}</span>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400">Local</p><p className="text-slate-700">{detalheBem.local || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Responsável</p><p className="text-slate-700">{detalheBem.responsavel || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Aquisição</p><p className="text-slate-700">{fmtData(detalheBem.data_aquisicao)}</p></div>
                <div><p className="text-xs text-slate-400">Valor</p><p className="text-slate-700">{fmtMoeda(detalheBem.valor_aquisicao)}</p></div>
                <div><p className="text-xs text-slate-400">Fornecedor</p><p className="text-slate-700">{detalheBem.fornecedor || "—"}</p></div>
                <div><p className="text-xs text-slate-400">Estado</p><p className="text-slate-700">{detalheBem.estado_conservacao || "—"}</p></div>
              </div>
              {detalheBem.nota_fiscal_url && <a href={detalheBem.nota_fiscal_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-800">📎 Ver nota fiscal</a>}
              {detalheBem.observacoes && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{detalheBem.observacoes}</p>}

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase">Custo acumulado em manutenção</p>
                  <p className="text-lg font-bold text-amber-800">{fmtMoeda(custoAcumulado(detalheBem.id))}</p>
                </div>
                <span className="text-2xl">🔧</span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Histórico de manutenções ({(manutencoesPorBem[detalheBem.id] || []).length})</p>
                {(manutencoesPorBem[detalheBem.id] || []).length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhuma manutenção registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {(manutencoesPorBem[detalheBem.id] || []).map(m => (
                      <div key={m.id} onClick={() => { setDetalheBem(null); abrirDetalheManut(m); }} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 transition">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-700 truncate">{m.defeito_relatado}</p>
                          <p className="text-[10px] text-slate-400">{fmtData(m.data)}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_MANUT_CFG[m.status].cor}`}>{STATUS_MANUT_CFG[m.status].label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 space-y-2">
              <button onClick={() => gerarEtiqueta(detalheBem)} className="w-full h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition">🏷️ Gerar etiqueta com QR Code</button>
              <div className="flex gap-2">
                <button onClick={() => abrirEdicao(detalheBem)} className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition">Editar</button>
                {souAdm && detalheBem.status !== "baixado" && (
                  <button onClick={() => { setBaixandoBem(detalheBem); setMotivoBaixa(""); }} className="flex-1 h-10 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition">Dar baixa</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE BAIXA */}
      {baixandoBem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">📉</div>
              <div><h3 className="font-bold text-slate-800">Dar baixa em "{baixandoBem.nome}"?</h3><p className="text-xs text-slate-400 mt-1">O bem deixa de aparecer como ativo no inventário.</p></div>
            </div>
            <textarea value={motivoBaixa} onChange={e => setMotivoBaixa(e.target.value)} placeholder="Motivo (opcional): perda, quebra irreparável, doação..." rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
            <div className="flex gap-3">
              <button onClick={() => setBaixandoBem(null)} disabled={processandoBaixa} className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">Cancelar</button>
              <button onClick={confirmarBaixa} disabled={processandoBaixa} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">{processandoBaixa ? "Salvando..." : "Confirmar baixa"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DETALHE / GESTÃO DE MANUTENÇÃO */}
      {detalheManut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) setDetalheManut(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">🔧 Chamado de manutenção</h2>
              <button onClick={() => setDetalheManut(null)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Defeito relatado por {detalheManut.relatado_por_nome || "—"} em {fmtData(detalheManut.data)}</p>
                <p className="text-sm text-slate-700 mt-1">{detalheManut.defeito_relatado}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
                <select value={formManut.status} onChange={e => setFormManut((f: any) => ({ ...f, status: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-white">
                  {Object.entries(STATUS_MANUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Local do conserto</label>
                  <input value={formManut.local_conserto} onChange={e => setFormManut((f: any) => ({ ...f, local_conserto: e.target.value }))} placeholder="Interno ou nome do fornecedor" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Custo</label>
                  <input type="number" step="0.01" value={formManut.custo} onChange={e => setFormManut((f: any) => ({ ...f, custo: e.target.value }))} placeholder="0,00" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Técnico/fornecedor</label>
                  <input value={formManut.tecnico_fornecedor} onChange={e => setFormManut((f: any) => ({ ...f, tecnico_fornecedor: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contato</label>
                  <input value={formManut.tecnico_contato} onChange={e => setFormManut((f: any) => ({ ...f, tecnico_contato: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Garantia até</label>
                <input type="date" value={formManut.garantia_ate} onChange={e => setFormManut((f: any) => ({ ...f, garantia_ate: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nota fiscal do conserto</label>
                <input type="file" accept="image/*,application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) setNotaManutFile(f); }} className="text-xs"/>
                {detalheManut.nota_fiscal_url && <a href={detalheManut.nota_fiscal_url} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-blue-600 hover:text-blue-800 mt-1">📎 Ver nota fiscal atual</a>}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ação tomada</label>
                <textarea value={formManut.acao_tomada} onChange={e => setFormManut((f: any) => ({ ...f, acao_tomada: e.target.value }))} placeholder="Ex: mandado pro técnico Fulano, aguardando peça..." rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              {detalheManut.contas_pagar_id && <p className="text-xs text-emerald-600 font-semibold">💰 Lançado automaticamente no Financeiro (Contas a Pagar)</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setDetalheManut(null)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">Fechar</button>
              <button onClick={salvarManutencao} disabled={salvandoManut} className="flex-1 h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">{salvandoManut ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
