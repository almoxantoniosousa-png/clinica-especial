"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { AssinaturaPad } from "@/components/assinatura-pad";
import { Search, Plus, X, Printer, Camera, PenLine } from "lucide-react";

type Ocorrencia = {
  id: string;
  data: string;
  texto: string;
  autor_email: string;
  autor_nome: string | null;
  foto_url: string | null;
  assinatura_base64: string | null;
  assinado_em: string | null;
  created_at: string;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function OcorrenciasPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [usuarioNome, setUsuarioNome] = useState("");
  const [usuarioRole, setUsuarioRole] = useState("");
  const podeCriar = ["adm", "admin", "aux_adm"].includes(usuarioRole);

  const [minhaAssinatura, setMinhaAssinatura] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [novoTexto, setNovoTexto] = useState("");
  const [novaData, setNovaData] = useState(hoje());
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [novaFotoPreview, setNovaFotoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [assinandoId, setAssinandoId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      setUsuarioEmail(user.email);
      const { data: u } = await supabase.from("usuarios").select("role, nome").eq("email", user.email).maybeSingle();
      if (u?.role) {
        setUsuarioNome(u.nome || "");
        setUsuarioRole((u.role || "").toString().trim().toLowerCase());
      } else {
        const { data: a } = await supabase.from("atendentes").select("role, nome").eq("email", user.email).maybeSingle();
        setUsuarioNome(a?.nome || "");
        setUsuarioRole((a?.role || "").toString().trim().toLowerCase());
      }
      const { data: assinatura } = await supabase.from("assinaturas").select("imagem_base64").eq("email", user.email).maybeSingle();
      setMinhaAssinatura(assinatura?.imagem_base64 || null);
    })();
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from("ocorrencias_diarias")
      .select("*")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    setOcorrencias((data ?? []) as Ocorrencia[]);
    setLoading(false);
  }

  function abrirNovo() {
    setNovoTexto("");
    setNovaData(hoje());
    setNovaFoto(null);
    setNovaFotoPreview(null);
    setErro("");
    setModalAberto(true);
  }

  async function salvar() {
    if (!novoTexto.trim()) { setErro("Escreva o que aconteceu."); return; }
    setSalvando(true);
    setErro("");

    let foto_url: string | null = null;
    if (novaFoto) {
      const ext = novaFoto.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("ocorrencias-fotos").upload(path, novaFoto);
      if (!upErr) foto_url = supabase.storage.from("ocorrencias-fotos").getPublicUrl(path).data.publicUrl;
    }

    const { data: nova, error } = await supabase.from("ocorrencias_diarias").insert({
      data: novaData,
      texto: novoTexto.trim(),
      autor_email: usuarioEmail,
      autor_nome: usuarioNome || null,
      foto_url,
    }).select().single();

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    await registrarLog(supabase, {
      usuario_email: usuarioEmail, usuario_nome: usuarioNome, acao: "Registrou ocorrência diária",
      tabela: "ocorrencias_diarias", registro_id: nova?.id, descricao: novoTexto.trim().slice(0, 120),
    });

    await supabase.from("notificacoes").insert({
      destinatario_role: "gestao",
      titulo: "📓 Nova ocorrência diária",
      mensagem: novoTexto.trim().slice(0, 140),
      tipo: "ocorrencia",
      link: "/ocorrencias",
      autor_nome: usuarioNome || null,
    });

    setModalAberto(false);
    carregar();
  }

  async function assinar(id: string, imagemBase64: string) {
    setConfirmando(true);
    setErroAssinatura("");
    await supabase.from("assinaturas").upsert({
      email: usuarioEmail, nome: usuarioNome || null, imagem_base64: imagemBase64, atualizado_em: new Date().toISOString(),
    });
    const { error } = await supabase.from("ocorrencias_diarias").update({
      assinatura_base64: imagemBase64, assinado_em: new Date().toISOString(),
    }).eq("id", id);
    setConfirmando(false);
    if (error) { setErroAssinatura("Não foi possível assinar. Tente novamente."); return; }
    setMinhaAssinatura(imagemBase64);
    setAssinandoId(null);
    carregar();
  }

  const filtradas = ocorrencias.filter(o =>
    o.texto.toLowerCase().includes(busca.toLowerCase()) ||
    (o.autor_nome || "").toLowerCase().includes(busca.toLowerCase()) ||
    o.data.includes(busca)
  );

  function formatarData(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition";

  return (
    <>
      <div className="print:hidden min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">📓 Ocorrência Diária</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {podeCriar ? "Registre acontecimentos fora da normalidade do dia a dia." : "Acompanhamento das ocorrências registradas pela administração."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            {podeCriar && (
              <button onClick={abrirNovo}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <Plus className="h-4 w-4" /> Nova ocorrência
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input type="text" placeholder="Buscar por texto, autor ou data (aaaa-mm-dd)..." value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full sm:w-96 rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <span className="text-5xl">📓</span>
            <p className="text-sm text-slate-400 mt-2">{busca ? "Nenhuma ocorrência encontrada." : "Nenhuma ocorrência registrada ainda."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.map((o) => (
              <div key={o.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">{formatarData(o.data)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Registrado por {o.autor_nome || o.autor_email}</p>
                  </div>
                  {o.assinado_em && (
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-full whitespace-nowrap">
                      ✓ Assinado
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{o.texto}</p>
                {o.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.foto_url} alt="Foto da ocorrência" className="mt-3 max-h-56 rounded-xl border border-slate-200 object-cover" />
                )}

                <div className="mt-4 pt-4 border-t border-slate-100">
                  {o.assinatura_base64 ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.assinatura_base64} alt={`Assinatura de ${o.autor_nome}`} className="h-10" />
                      <p className="text-[10px] text-slate-400 border-t border-slate-300 pt-1 mt-0.5 w-fit min-w-[140px]">
                        {o.autor_nome} — assinado em {new Date(o.assinado_em!).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ) : o.autor_email === usuarioEmail ? (
                    assinandoId === o.id ? (
                      <div className="max-w-sm">
                        <AssinaturaPad salvando={confirmando} onSalvar={(img) => assinar(o.id, img)} />
                        {erroAssinatura && <p className="text-[11px] text-red-600 mt-2">{erroAssinatura}</p>}
                      </div>
                    ) : minhaAssinatura ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={minhaAssinatura} alt="Sua assinatura salva" className="h-9 border-b border-slate-300" />
                        <button onClick={() => assinar(o.id, minhaAssinatura)} disabled={confirmando}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50">
                          {confirmando ? "Confirmando..." : "Confirmar com minha assinatura"}
                        </button>
                        <button onClick={() => setAssinandoId(o.id)} className="text-xs text-slate-400 hover:text-slate-600">
                          Assinar de novo
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setAssinandoId(o.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800">
                        <PenLine className="h-3.5 w-3.5" /> Assinar esta ocorrência
                      </button>
                    )
                  ) : (
                    <p className="text-xs text-amber-600">Pendente de assinatura por {o.autor_nome || o.autor_email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL — Nova ocorrência */}
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Nova ocorrência</h2>
                <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</label>
                  <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className={`mt-1 ${inputClass}`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">O que aconteceu *</label>
                  <textarea rows={6} placeholder="Descreva o ocorrido..." value={novoTexto}
                    onChange={(e) => setNovoTexto(e.target.value)} className={`mt-1 ${inputClass} resize-none`} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Foto (opcional)</label>
                  <div className="mt-1 flex items-center gap-3">
                    <button type="button" onClick={() => inputFotoRef.current?.click()}
                      className="flex items-center gap-2 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-slate-50 transition">
                      <Camera className="h-4 w-4" /> {novaFotoPreview ? "Trocar foto" : "Adicionar foto"}
                    </button>
                    {novaFotoPreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={novaFotoPreview} alt="Prévia" className="h-12 w-12 rounded-lg object-cover border border-slate-200" />
                    )}
                  </div>
                  <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setNovaFoto(f); setNovaFotoPreview(URL.createObjectURL(f)); }
                    }} />
                </div>
              </div>

              {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setModalAberto(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando || !novoTexto.trim()}
                  className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
                  {salvando ? "Salvando..." : "Registrar ocorrência"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VERSÃO PRA IMPRIMIR */}
      <div className="hidden print:block p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Ocorrência Diária — Clínica Abraço</h1>
        <p className="text-xs text-slate-400 mb-6">{filtradas.length} registro{filtradas.length !== 1 ? "s" : ""}{busca ? ` (filtrado por "${busca}")` : ""}</p>
        <div className="space-y-6">
          {filtradas.map((o) => (
            <div key={o.id} className="pb-4 border-b border-slate-300 break-inside-avoid">
              <p className="text-xs font-bold uppercase tracking-wide">{formatarData(o.data)} — {o.autor_nome || o.autor_email}</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{o.texto}</p>
              {o.assinatura_base64 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.assinatura_base64} alt="Assinatura" className="h-10 mt-2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
