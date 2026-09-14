"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { AssinaturaPad } from "@/components/assinatura-pad";
import { hojeLocal } from "@/lib/dataUtils";
import { FileWarning, Plus, Paperclip, Download } from "lucide-react";

type Registro = {
  id: string;
  atendente_id: string;
  data_fato: string;
  protocolo_id: string | null;
  protocolo_titulo: string | null;
  descricao: string;
  anexo_url: string | null;
  registrado_por_nome: string;
  assinatura_base64: string | null;
  assinado_em: string | null;
  created_at: string;
  atendente_nome?: string;
};

type AtSimples = { id: string; nome: string };
type ProtocoloSimples = { id: string; titulo: string };

function sanitizarNomeArquivo(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function formatarData(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function NaoConformidadesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [carregando, setCarregando] = useState(true);
  const [meuEmail, setMeuEmail] = useState("");
  const [meuNome, setMeuNome] = useState("");
  const [meuAtendenteId, setMeuAtendenteId] = useState<string | null>(null);
  const [podeGerenciar, setPodeGerenciar] = useState(false);

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [ats, setAts] = useState<AtSimples[]>([]);
  const [protocolos, setProtocolos] = useState<ProtocoloSimples[]>([]);

  const [filtroAt, setFiltroAt] = useState<string>("todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  // Formulário de novo registro
  const [fAtendenteId, setFAtendenteId] = useState("");
  const [fData, setFData] = useState(hojeLocal());
  const [fProtocoloId, setFProtocoloId] = useState("");
  const [fDescricao, setFDescricao] = useState("");
  const [fAnexo, setFAnexo] = useState<File | null>(null);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  useEffect(() => {
    async function carregarPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMeuEmail(user.email || "");

      const { data: usuario } = await supabase.from("usuarios").select("role, nome").eq("email", user.email).maybeSingle();
      if (usuario) {
        setMeuNome(usuario.nome || user.email || "");
        setPodeGerenciar(["adm", "admin", "gestao", "supervisora"].includes((usuario.role || "").toLowerCase()));
        return;
      }
      const { data: atendente } = await supabase.from("atendentes").select("id, nome, role").eq("email", user.email).maybeSingle();
      if (atendente) {
        setMeuNome(atendente.nome || user.email || "");
        setMeuAtendenteId(atendente.id);
        setPodeGerenciar(["adm", "admin", "gestao", "supervisora"].includes((atendente.role || "").toLowerCase()));
      }
    }
    carregarPerfil();
  }, [supabase]);

  async function carregar() {
    setCarregando(true);
    const { data: regs } = await supabase.from("nao_conformidades").select("*").order("data_fato", { ascending: false });
    const { data: atsData } = await supabase.from("atendentes").select("id, nome").eq("role", "atendente").eq("ativo", true).order("nome");
    const { data: protocolosData } = await supabase.from("protocolos_conduta").select("id, titulo").order("titulo");

    const mapaAts: Record<string, string> = {};
    (atsData || []).forEach((a: AtSimples) => { mapaAts[a.id] = a.nome; });

    setRegistros((regs || []).map((r: Registro) => ({ ...r, atendente_nome: mapaAts[r.atendente_id] || "—" })));
    setAts(atsData || []);
    setProtocolos(protocolosData || []);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, [supabase]);

  const registrosVisiveis = filtroAt === "todas" ? registros : registros.filter(r => r.atendente_id === filtroAt);

  function abrirModal() {
    setFAtendenteId(""); setFData(hojeLocal()); setFProtocoloId(""); setFDescricao(""); setFAnexo(null);
    setModalAberto(true);
  }

  async function salvarRegistro() {
    if (!fAtendenteId || !fDescricao.trim()) {
      mostrarFeedback("erro", "Selecione a AT e descreva o fato.");
      return;
    }
    setSalvando(true);
    try {
      let anexo_url: string | null = null;
      if (fAnexo) {
        const caminho = `${fAtendenteId}/${Date.now()}-${sanitizarNomeArquivo(fAnexo.name)}`;
        const { error: upErr } = await supabase.storage.from("nao-conformidades-anexos").upload(caminho, fAnexo);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("nao-conformidades-anexos").getPublicUrl(caminho);
        anexo_url = data.publicUrl;
      }

      const protocolo = protocolos.find(p => p.id === fProtocoloId);
      const { data: novo, error } = await supabase.from("nao_conformidades").insert({
        atendente_id: fAtendenteId,
        data_fato: fData,
        protocolo_id: fProtocoloId || null,
        protocolo_titulo: protocolo?.titulo || null,
        descricao: fDescricao.trim(),
        anexo_url,
        registrado_por_nome: meuNome,
      }).select().single();
      if (error) throw error;

      await registrarLog(supabase, {
        usuario_email: meuEmail, usuario_nome: meuNome,
        acao: "Registrou não conformidade", tabela: "nao_conformidades", registro_id: novo?.id,
        descricao: `${ats.find(a => a.id === fAtendenteId)?.nome || fAtendenteId} — ${fDescricao.trim().slice(0, 80)}`,
      });

      mostrarFeedback("sucesso", "Registro criado.");
      setModalAberto(false);
      carregar();
    } catch (e: any) {
      mostrarFeedback("erro", "Erro ao salvar: " + (e?.message || "tente novamente"));
    } finally {
      setSalvando(false);
    }
  }

  async function assinar(registro: Registro, imagemBase64: string) {
    const { error } = await supabase.from("nao_conformidades").update({
      assinatura_base64: imagemBase64, assinado_em: new Date().toISOString(),
    }).eq("id", registro.id);
    if (error) { mostrarFeedback("erro", "Não foi possível assinar: " + error.message); return; }
    mostrarFeedback("sucesso", "Ciência confirmada.");
    carregar();
  }

  async function exportarPdf(atendenteId: string) {
    const nome = ats.find(a => a.id === atendenteId)?.nome || "Colaborador";
    const itens = registros.filter(r => r.atendente_id === atendenteId).sort((a, b) => a.data_fato.localeCompare(b.data_fato));
    if (itens.length === 0) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Histórico de Não Conformidades", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Colaborador(a): ${nome}`, 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")} — Clínica Abraço`, 14, y);
    doc.setTextColor(0);
    y += 10;

    for (const item of itens) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setDrawColor(220);
      doc.line(14, y, 196, y);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Data do fato: ${formatarData(item.data_fato)}`, 14, y);
      y += 5;
      if (item.protocolo_titulo) {
        doc.setFont("helvetica", "normal");
        doc.text(`Protocolo referenciado: ${item.protocolo_titulo}`, 14, y);
        y += 5;
      }
      doc.setFont("helvetica", "normal");
      const linhas = doc.splitTextToSize(`Descrição: ${item.descricao}`, 182);
      doc.text(linhas, 14, y);
      y += linhas.length * 5 + 1;
      doc.text(`Registrado por: ${item.registrado_por_nome}`, 14, y);
      y += 5;
      doc.text(
        item.assinado_em
          ? `Ciência confirmada pela AT em ${new Date(item.assinado_em).toLocaleString("pt-BR")}`
          : "Ciência: AINDA NÃO CONFIRMADA pela AT",
        14, y
      );
      y += 8;
    }

    doc.save(`Nao_Conformidades_${nome.replace(/\s+/g, "_")}.pdf`);
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-16 text-sm text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <FileWarning className="text-red-500" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Não Conformidades</h1>
            <p className="text-xs text-slate-400 mt-0.5">Descumprimento de Protocolo de Conduta — registro objetivo, com ciência formal</p>
          </div>
        </div>
        {podeGerenciar && (
          <button onClick={abrirModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition">
            <Plus size={16} /> Nova notificação
          </button>
        )}
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {feedback.msg}
        </div>
      )}

      {podeGerenciar && (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filtroAt} onChange={e => setFiltroAt(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="todas">Todas as ATs</option>
            {ats.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          {filtroAt !== "todas" && (
            <button onClick={() => exportarPdf(filtroAt)}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition">
              <Download size={14} /> Exportar dossiê em PDF
            </button>
          )}
        </div>
      )}

      {registrosVisiveis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileWarning className="text-slate-300 mb-2" size={40} />
          <p className="text-sm text-slate-400">Nenhum registro por aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registrosVisiveis.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  {podeGerenciar && <p className="font-semibold text-slate-800 text-sm">{r.atendente_nome}</p>}
                  <p className="text-xs text-slate-400">Fato em {formatarData(r.data_fato)} · registrado por {r.registrado_por_nome}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0
                  ${r.assinado_em ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  {r.assinado_em ? "✓ Ciência confirmada" : "⏳ Aguardando ciência"}
                </span>
              </div>
              {r.protocolo_titulo && (
                <p className="text-xs bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 inline-block text-slate-600">
                  📋 Protocolo: {r.protocolo_titulo}
                </p>
              )}
              <p className="text-sm text-slate-700 leading-relaxed">{r.descricao}</p>
              {r.anexo_url && (
                <a href={r.anexo_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline">
                  <Paperclip size={13} /> Ver anexo
                </a>
              )}

              {/* AT assina a própria, se ainda não assinou */}
              {!podeGerenciar && meuAtendenteId === r.atendente_id && !r.assinado_em && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Confirmar ciência</p>
                  <AssinaturaPad onSalvar={(img) => assinar(r, img)} />
                </div>
              )}
              {r.assinado_em && r.assinatura_base64 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 mb-1">Assinatura de ciência:</p>
                  <img src={r.assinatura_base64} alt="Assinatura" className="h-16 border border-slate-100 rounded-lg bg-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL NOVO REGISTRO */}
      {modalAberto && podeGerenciar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-8 sm:pt-24 overflow-y-auto"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-blue-900 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white text-sm">Nova notificação de não conformidade</h2>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">AT *</label>
                <select value={fAtendenteId} onChange={e => setFAtendenteId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {ats.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data do fato *</label>
                <input type="date" value={fData} onChange={e => setFData(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Protocolo referenciado (opcional)</label>
                <select value={fProtocoloId} onChange={e => setFProtocoloId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Nenhum específico</option>
                  {protocolos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição objetiva do fato *</label>
                <textarea rows={4} value={fDescricao} onChange={e => setFDescricao(e.target.value)}
                  placeholder="Descreva o que aconteceu, com fatos concretos (data, local, o que foi observado) — evite opinião/julgamento."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Anexo (opcional — foto, print, etc.)</label>
                <input type="file" onChange={e => setFAnexo(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-semibold"/>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-white">
              <button onClick={salvarRegistro} disabled={salvando}
                className="w-full h-11 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
