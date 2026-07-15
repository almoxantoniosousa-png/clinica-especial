"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { registrarLog } from "@/lib/auditoria";

type Bem = { id: string; numero_tombamento: number; nome: string; categoria: string; local: string | null; foto_url: string | null; status: string };

export default function ReportarDefeitoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [bem, setBem] = useState<Bem | null>(null);
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [defeito, setDefeito] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!params.id) return;
    supabase.from("patrimonio").select("id, numero_tombamento, nome, categoria, local, foto_url, status").eq("id", params.id).maybeSingle()
      .then(({ data }) => {
        if (!data) setNaoEncontrado(true);
        setBem(data);
        setLoading(false);
      });
  }, [params.id]);

  async function enviar() {
    if (!defeito.trim()) return;
    setEnviando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setEnviando(false); return; }

    let nomeUsuario = user.email || "Colaborador";
    const { data: at } = await supabase.from("atendentes").select("nome").eq("email", user.email).maybeSingle();
    if (at?.nome) nomeUsuario = at.nome;
    else {
      const { data: us } = await supabase.from("usuarios").select("nome").eq("email", user.email).maybeSingle();
      if (us?.nome) nomeUsuario = us.nome;
    }

    let foto_url: string | null = null;
    if (fotoFile) {
      const ext = fotoFile.name.split(".").pop();
      const path = `defeitos/${params.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("patrimonio-arquivos").upload(path, fotoFile);
      if (!upErr) foto_url = supabase.storage.from("patrimonio-arquivos").getPublicUrl(path).data.publicUrl;
    }

    const descricaoCompleta = foto_url ? `${defeito}\n\n📷 Foto: ${foto_url}` : defeito;

    const { data: novo, error } = await supabase.from("manutencoes_equipamentos").insert({
      patrimonio_id: params.id,
      defeito_relatado: descricaoCompleta,
      relatado_por_nome: nomeUsuario,
      relatado_por_email: user.email,
      status: "aberto",
    }).select().single();

    setEnviando(false);
    if (error) return;

    await registrarLog(supabase, {
      usuario_email: user.email || "desconhecido",
      usuario_nome: nomeUsuario,
      acao: "Reportou defeito em equipamento",
      tabela: "manutencoes_equipamentos",
      registro_id: novo?.id,
      descricao: `${bem?.nome || "Equipamento"}: ${defeito}`,
    });

    await supabase.from("notificacoes").insert({
      destinatario_role: "adm",
      titulo: "⚠️ Defeito reportado em equipamento",
      mensagem: `${nomeUsuario} reportou um problema em "${bem?.nome}": ${defeito.slice(0, 120)}`,
      tipo: "alerta",
      link: "/adm/patrimonio",
      autor_nome: nomeUsuario,
    });

    setEnviado(true);
  }

  if (loading) return <div className="text-center py-16 text-slate-400 text-sm">Carregando...</div>;

  if (naoEncontrado) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">❓</span>
      <p className="text-sm text-slate-400 mt-2">Equipamento não encontrado.</p>
      <button onClick={() => router.push("/patrimonio")} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800">Ver todos os equipamentos</button>
    </div>
  );

  if (enviado) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3">
      <span className="text-5xl">✅</span>
      <p className="text-sm font-semibold text-slate-700">Defeito reportado com sucesso!</p>
      <p className="text-xs text-slate-400">A administração foi avisada e vai avaliar em breve.</p>
      <button onClick={() => router.push("/patrimonio")} className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800">Voltar</button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reportar defeito</h1>
        <p className="text-xs text-slate-400 mt-0.5">Conte o que está acontecendo com este equipamento</p>
      </div>

      <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-3">
        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {bem?.foto_url ? <img src={bem.foto_url} alt="" className="w-full h-full object-cover"/> : <span className="text-2xl opacity-40">📦</span>}
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">{bem?.nome}</p>
          <p className="text-xs text-slate-400">T-{bem?.numero_tombamento.toString().padStart(4, "0")} · {bem?.categoria}{bem?.local ? ` · ${bem.local}` : ""}</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">O que está acontecendo? *</label>
        <textarea value={defeito} onChange={e => setDefeito(e.target.value)} placeholder="Descreva o problema com o máximo de detalhes possível..." rows={4}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"/>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Foto (opcional)</label>
        <div onClick={() => inputRef.current?.click()} className="w-full h-32 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center cursor-pointer overflow-hidden bg-white hover:bg-blue-50 transition">
          {fotoPreview ? <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover"/> : <div className="text-center"><span className="text-3xl">📷</span><p className="text-xs text-slate-400 mt-1">Tirar foto ou escolher da galeria</p></div>}
        </div>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); } }}/>
      </div>

      <button onClick={enviar} disabled={!defeito.trim() || enviando}
        className="w-full h-12 rounded-xl bg-blue-900 text-white text-sm font-bold hover:bg-blue-800 transition disabled:opacity-50">
        {enviando ? "Enviando..." : "Enviar para a administração"}
      </button>
    </div>
  );
}
