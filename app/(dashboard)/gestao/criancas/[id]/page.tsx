"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { AnexoDocumentos, type DocumentoAnexo } from "@/components/anexo-documentos";
import { CAMPOS_DETALHE } from "../../entrevista-inicial/page";

const inputClass = "w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-400 bg-white";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

function Secao({ titulo, icone, children, acao }: { titulo: string; icone: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-base">{icone}</span>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{titulo}</h3>
        </div>
        {acao}
      </div>
      {children}
    </div>
  );
}

const TIPO_LABEL: Record<string, { label: string; cor: string }> = {
  relatorio: { label: "Relatório", cor: "bg-blue-50 text-blue-700 border-blue-200" },
  relatorio_diario: { label: "Relatório diário", cor: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  relatorio_supervisora: { label: "Registro ABC — Supervisora", cor: "bg-purple-50 text-purple-700 border-purple-200" },
  acompanhamento_at: { label: "Acompanhamento — AT", cor: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function CardCriancaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const inputFotoEditRef = useRef<HTMLInputElement>(null);

  const [crianca, setCrianca] = useState<any>(null);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [entrevista, setEntrevista] = useState<any>(null);
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [evolucao, setEvolucao] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);

  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState<any>({});
  const [fotoEditFile, setFotoEditFile] = useState<File | null>(null);
  const [fotoEditPreview, setFotoEditPreview] = useState<string | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  function mostrarFeedback(tipo: "sucesso" | "erro", msg: string) {
    setFeedback({ tipo, msg });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function carregar() {
    setLoading(true);
    const [
      { data: c },
      { data: escolasData },
      { data: e },
      { data: p },
      { data: ev },
      { data: pl },
      { data: ma },
      { data: r },
    ] = await Promise.all([
      supabase.from("criancas").select("*, escolas(nome)").eq("id", id).maybeSingle(),
      supabaseClient.from("escolas").select("id, nome").order("nome"),
      supabase.from("entrevistas_iniciais").select("*").eq("crianca_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("prontuarios").select("*").eq("crianca_id", id).order("created_at", { ascending: false }),
      supabase.from("portal_evolucao").select("*").eq("crianca_id", id).order("created_at", { ascending: false }),
      supabase.from("planos_terapeuticos").select("*").eq("crianca_id", id).order("created_at", { ascending: false }),
      supabase.from("materiais_adaptados").select("*").eq("crianca_id", id).order("created_at", { ascending: false }),
      supabase.from("responsaveis").select("*").eq("crianca_id", id).order("created_at", { ascending: false }),
    ]);
    setCrianca(c || null);
    setEscolas(escolasData || []);
    setEntrevista(e || null);
    setProntuarios(p || []);
    setEvolucao(ev || []);
    setPlanos(pl || []);
    setMateriais(ma || []);
    setResponsaveis(r || []);
    setLoading(false);
  }

  useEffect(() => { if (id) carregar(); }, [id]);

  function abrirEdicao() {
    if (!crianca) return;
    setFormEdit({
      nome: crianca.nome || "",
      cpf: crianca.cpf || "",
      data_nascimento: crianca.data_nascimento || "",
      sexo: crianca.sexo || "",
      responsavel: crianca.responsavel || "",
      telefone_responsavel: crianca.telefone_responsavel || "",
      email_responsavel: crianca.email_responsavel || "",
      nome_mae: crianca.nome_mae || "",
      nome_pai: crianca.nome_pai || "",
      escola_id: crianca.escola_id || "",
      serie: crianca.serie || "",
      plano_saude: crianca.plano_saude || "",
      numero_processo: crianca.numero_processo || "",
      diagnostico: crianca.diagnostico || "",
      cid: crianca.cid || "",
      alergias: crianca.alergias || "",
      medicamentos: crianca.medicamentos || "",
      observacoes: crianca.observacoes || "",
      documentos: crianca.documentos || [],
      ativo: crianca.ativo !== false,
    });
    setFotoEditPreview(crianca.foto_url || null);
    setFotoEditFile(null);
    setEditando(true);
  }

  async function uploadFoto(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${id}.${ext}`;
    const { error } = await supabase.storage.from("fotos-criancas").upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("fotos-criancas").getPublicUrl(path);
    return data.publicUrl;
  }

  async function salvarEdicao() {
    if (!formEdit.nome?.trim()) return;
    setSalvandoEdicao(true);
    let foto_url = crianca.foto_url;
    if (fotoEditFile) {
      const url = await uploadFoto(fotoEditFile);
      if (url) foto_url = url;
    }
    const { error } = await supabase.from("criancas").update({
      ...formEdit,
      nome: formEdit.nome.trim(),
      escola_id: formEdit.escola_id || null,
      data_nascimento: formEdit.data_nascimento || null,
      foto_url,
    }).eq("id", id);

    if (!error) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      await registrarLog(supabaseClient, {
        usuario_email: user?.email || "desconhecido",
        acao: "Editou",
        tabela: "criancas",
        registro_id: id,
        descricao: `Editou o card de: ${formEdit.nome.trim()}`,
      });
    }

    setSalvandoEdicao(false);
    if (error) {
      mostrarFeedback("erro", "Erro ao salvar: " + error.message);
    } else {
      setEditando(false);
      carregar();
      mostrarFeedback("sucesso", "Card atualizado!");
    }
  }

  function calcularIdade(dataNasc: string | null) {
    if (!dataNasc) return null;
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    const anos = hoje.getFullYear() - nasc.getFullYear();
    const meses = hoje.getMonth() - nasc.getMonth();
    if (anos === 0) return `${meses} meses`;
    return `${anos} anos`;
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Carregando...</div>;
  }

  if (!crianca) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <span className="text-4xl">👶</span>
        <p className="text-sm text-slate-400">Criança não encontrada.</p>
        <button onClick={() => router.push("/gestao/criancas")} className="text-sm text-blue-700 font-medium mt-2">← Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/gestao/criancas")}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shrink-0">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900 truncate">{crianca.nome}</h1>
          <p className="text-xs text-slate-400 mt-0.5">Tudo sobre essa criança em um lugar só</p>
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border
          ${feedback.tipo === "sucesso" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span>{feedback.tipo === "sucesso" ? "✓" : "✕"}</span>
          {feedback.msg}
        </div>
      )}

      <Secao titulo="Cadastro" icone="🪪" acao={
        <button onClick={abrirEdicao} className="h-8 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition">
          ✎ Editar
        </button>
      }>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center">
            {crianca.foto_url ? (
              <img src={crianca.foto_url} alt={crianca.nome} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-700">{crianca.nome?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm flex-1">
            <p><span className="text-slate-400">Nascimento:</span> {crianca.data_nascimento ? `${new Date(crianca.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")} (${calcularIdade(crianca.data_nascimento)})` : "—"}</p>
            <p><span className="text-slate-400">Sexo:</span> {crianca.sexo === "M" ? "Masculino" : crianca.sexo === "F" ? "Feminino" : "—"}</p>
            <p><span className="text-slate-400">Responsável:</span> {crianca.responsavel || "—"}</p>
            <p><span className="text-slate-400">Telefone:</span> {crianca.telefone_responsavel || "—"}</p>
            <p><span className="text-slate-400">E-mail:</span> {crianca.email_responsavel || "—"}</p>
            <p><span className="text-slate-400">Escola:</span> {crianca.escolas?.nome || "—"}{crianca.serie ? ` — ${crianca.serie}` : ""}</p>
            <p><span className="text-slate-400">Plano de saúde:</span> {crianca.plano_saude || "—"}</p>
            <p><span className="text-slate-400">Diagnóstico:</span> {crianca.diagnostico || "—"}{crianca.cid ? ` (${crianca.cid})` : ""}</p>
            {crianca.alergias && <p className="text-red-600"><span className="text-slate-400">Alergias:</span> {crianca.alergias}</p>}
            {crianca.medicamentos && <p><span className="text-slate-400">Medicamentos:</span> {crianca.medicamentos}</p>}
            {crianca.observacoes && <p className="sm:col-span-2"><span className="text-slate-400">Observações:</span> {crianca.observacoes}</p>}
            <p className="sm:col-span-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${crianca.ativo === false ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                {crianca.ativo === false ? "Inativo" : "Ativo"}
              </span>
            </p>
          </div>
        </div>
      </Secao>

      {entrevista && (
        <Secao titulo="Entrevista Inicial" icone="📋">
          <p className="text-xs text-slate-400 -mt-2">Respondida pela família em {entrevista.respondido_em ? formatarData(entrevista.respondido_em) : "—"}.</p>
          {CAMPOS_DETALHE.map(sec => {
            const preenchidos = sec.campos.filter(c => entrevista[c.chave]);
            if (preenchidos.length === 0) return null;
            return (
              <div key={sec.secao} className="space-y-1.5 pt-2 border-t border-slate-100 first:border-t-0 first:pt-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{sec.secao}</p>
                {preenchidos.map(c => (
                  <p key={c.chave} className="text-sm text-slate-700"><span className="font-medium text-slate-500">{c.label}:</span> {String(entrevista[c.chave])}</p>
                ))}
              </div>
            );
          })}
          <button onClick={() => router.push("/gestao/entrevista-inicial")}
            className="text-xs text-blue-700 font-semibold hover:underline pt-1">
            Editar agendamento e convênio →
          </button>
        </Secao>
      )}

      <Secao titulo="Prontuários Clínicos" icone="🩺">
        {prontuarios.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum registro ainda.</p>
        ) : (
          <div className="space-y-2">
            {prontuarios.map(p => {
              const cfg = TIPO_LABEL[p.tipo] || { label: p.tipo, cor: "bg-slate-50 text-slate-600 border-slate-200" };
              return (
                <div key={p.id} className="border border-slate-100 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.titulo}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.cor}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-slate-400">{p.autor_nome} · {formatarData(p.created_at)}</p>
                  {p.feedback_gestao && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 mt-1">💬 {p.feedback_gestao}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Secao>

      <Secao titulo="Evolução" icone="📈">
        {evolucao.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum registro ainda.</p>
        ) : (
          <div className="space-y-2">
            {evolucao.map(ev => (
              <div key={ev.id} className="border border-slate-100 rounded-xl p-3 space-y-1">
                <p className="text-sm font-medium text-slate-800">{ev.titulo}</p>
                <p className="text-sm text-slate-600">{ev.conteudo}</p>
                <p className="text-xs text-slate-400">{formatarData(ev.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Planos Terapêuticos" icone="🎯">
        {planos.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum plano ainda.</p>
        ) : (
          <div className="space-y-2">
            {planos.map(pl => (
              <div key={pl.id} className="border border-slate-100 rounded-xl p-3 space-y-1">
                <p className="text-sm font-medium text-slate-800">{pl.local_contexto || "Plano terapêutico"}</p>
                <p className="text-xs text-slate-400">Reunião em {pl.data_reuniao ? formatarData(pl.data_reuniao) : "—"} · Próxima revisão: {pl.proxima_revisao ? formatarData(pl.proxima_revisao) : "—"}</p>
                {pl.estrategias_gerais && <p className="text-sm text-slate-600">{pl.estrategias_gerais}</p>}
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Materiais Adaptados" icone="📚">
        {materiais.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum material ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {materiais.map(m => (
              <span key={m.id} className="text-xs bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-slate-700">
                {m.titulo_livro} {m.materia ? `· ${m.materia}` : ""} {m.status === "revisao" ? "(em revisão)" : ""}
              </span>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Responsáveis com acesso ao Portal" icone="👨‍👩‍👧">
        {responsaveis.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum responsável cadastrado no Portal da Família ainda.</p>
        ) : (
          <div className="space-y-2">
            {responsaveis.map(r => (
              <div key={r.id} className="flex items-center justify-between border border-slate-100 rounded-xl p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.nome}</p>
                  <p className="text-xs text-slate-400">{r.email} {r.telefone ? `· ${r.telefone}` : ""}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.ativo === false ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                  {r.ativo === false ? "Inativo" : "Ativo"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Secao>

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditando(false); }}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-900 px-6 py-4 flex items-center justify-between sticky top-0 rounded-t-2xl">
              <h3 className="text-white font-bold">Editar cadastro — {crianca.nome}</h3>
              <button onClick={() => setEditando(false)} className="text-blue-200 hover:text-white transition text-xl">✕</button>
            </div>

            <div className="p-6 space-y-8">
              <div className="flex items-center gap-4">
                <div onClick={() => inputFotoEditRef.current?.click()}
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden bg-slate-50 transition">
                  {fotoEditPreview ? <img src={fotoEditPreview} alt="Preview" className="w-full h-full object-cover"/> : <span className="text-2xl">📷</span>}
                </div>
                <input ref={inputFotoEditRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFotoEditFile(f); setFotoEditPreview(URL.createObjectURL(f)); } }}/>
                <p className="text-xs text-slate-500">Clique para alterar a foto</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nome completo</label>
                  <input type="text" value={formEdit.nome || ""} onChange={(e) => setFormEdit({ ...formEdit, nome: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Data de nascimento</label>
                  <input type="date" value={formEdit.data_nascimento || ""} onChange={(e) => setFormEdit({ ...formEdit, data_nascimento: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Sexo</label>
                  <select value={formEdit.sexo || ""} onChange={(e) => setFormEdit({ ...formEdit, sexo: e.target.value })} className={inputClass}>
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>CPF</label>
                  <input type="text" value={formEdit.cpf || ""} onChange={(e) => setFormEdit({ ...formEdit, cpf: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Escola</label>
                  <select value={formEdit.escola_id || ""} onChange={(e) => setFormEdit({ ...formEdit, escola_id: e.target.value })} className={inputClass}>
                    <option value="">Sem escola</option>
                    {escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Série escolar</label>
                  <input type="text" value={formEdit.serie || ""} onChange={(e) => setFormEdit({ ...formEdit, serie: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Nome do responsável</label>
                  <input type="text" value={formEdit.responsavel || ""} onChange={(e) => setFormEdit({ ...formEdit, responsavel: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Telefone / WhatsApp</label>
                  <input type="text" value={formEdit.telefone_responsavel || ""} onChange={(e) => setFormEdit({ ...formEdit, telefone_responsavel: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input type="email" value={formEdit.email_responsavel || ""} onChange={(e) => setFormEdit({ ...formEdit, email_responsavel: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Filiação — Nome da mãe</label>
                  <input type="text" value={formEdit.nome_mae || ""} onChange={(e) => setFormEdit({ ...formEdit, nome_mae: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Filiação — Nome do pai</label>
                  <input type="text" value={formEdit.nome_pai || ""} onChange={(e) => setFormEdit({ ...formEdit, nome_pai: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Plano de saúde</label>
                  <input type="text" value={formEdit.plano_saude || ""} onChange={(e) => setFormEdit({ ...formEdit, plano_saude: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Número do processo</label>
                  <input type="text" value={formEdit.numero_processo || ""} onChange={(e) => setFormEdit({ ...formEdit, numero_processo: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Diagnóstico</label>
                  <input type="text" value={formEdit.diagnostico || ""} onChange={(e) => setFormEdit({ ...formEdit, diagnostico: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>CID</label>
                  <input type="text" value={formEdit.cid || ""} onChange={(e) => setFormEdit({ ...formEdit, cid: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Alergias</label>
                  <input type="text" value={formEdit.alergias || ""} onChange={(e) => setFormEdit({ ...formEdit, alergias: e.target.value })} className={inputClass}/>
                </div>
                <div>
                  <label className={labelClass}>Medicamentos em uso</label>
                  <input type="text" value={formEdit.medicamentos || ""} onChange={(e) => setFormEdit({ ...formEdit, medicamentos: e.target.value })} className={inputClass}/>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Observações</label>
                  <textarea value={formEdit.observacoes || ""} onChange={(e) => setFormEdit({ ...formEdit, observacoes: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white resize-none" rows={3}/>
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <div onClick={() => setFormEdit({ ...formEdit, ativo: !formEdit.ativo })}
                      className={`w-12 h-6 rounded-full transition-colors ${formEdit.ativo ? "bg-emerald-500" : "bg-slate-300"} relative`}>
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${formEdit.ativo ? "left-6" : "left-0.5"}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Ativo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className={labelClass}>Documentos</label>
                <AnexoDocumentos
                  pastaId={id}
                  documentos={formEdit.documentos || []}
                  onChange={(docs: DocumentoAnexo[]) => setFormEdit({ ...formEdit, documentos: docs })}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditando(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button onClick={salvarEdicao} disabled={salvandoEdicao || !formEdit.nome?.trim()}
                  className="flex-1 h-11 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition disabled:opacity-50">
                  {salvandoEdicao ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
