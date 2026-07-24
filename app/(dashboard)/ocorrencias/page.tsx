"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { registrarLog } from "@/lib/auditoria";
import { AssinaturaPad } from "@/components/assinatura-pad";
import { Search, Plus, Printer, Camera, PenLine, Pencil, Trash2, Check, X } from "lucide-react";

type Item = {
  id: string;
  texto: string;
  foto_url: string | null;
  created_at: string;
};

type Ocorrencia = {
  id: string;
  data: string;
  autor_email: string;
  autor_nome: string | null;
  assinatura_base64: string | null;
  assinado_em: string | null;
  created_at: string;
  itens: Item[];
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function formatarHora(dt: string) {
  return new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition";

function CardItem({
  item, editavel, editando, textoEditando, onTextoChange, onSalvarEdicao, onCancelarEdicao, onIniciarEdicao, onExcluir,
}: {
  item: Item;
  editavel: boolean;
  editando: boolean;
  textoEditando: string;
  onTextoChange: (v: string) => void;
  onSalvarEdicao: () => void;
  onCancelarEdicao: () => void;
  onIniciarEdicao: () => void;
  onExcluir: () => void;
}) {
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-[11px] text-slate-400 font-mono pt-0.5 shrink-0 w-11">{formatarHora(item.created_at)}</span>
      <div className="flex-1 min-w-0">
        {editando ? (
          <div className="space-y-2">
            <textarea rows={3} value={textoEditando} onChange={(e) => onTextoChange(e.target.value)} autoFocus
              className={`${inputClass} resize-none`} />
            <div className="flex gap-2">
              <button onClick={onSalvarEdicao}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition">
                <Check className="h-3.5 w-3.5" /> Salvar
              </button>
              <button onClick={onCancelarEdicao}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition">
                <X className="h-3.5 w-3.5" /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{item.texto}</p>
            {item.foto_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.foto_url} alt="Foto da ocorrência" className="mt-2 max-h-40 rounded-xl border border-slate-200 object-cover" />
            )}
          </>
        )}
      </div>
      {editavel && !editando && (
        <div className="flex items-start gap-1 shrink-0">
          <button onClick={onIniciarEdicao} title="Editar"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onExcluir} title="Excluir"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function OcorrenciasPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [usuarioNome, setUsuarioNome] = useState("");
  const [usuarioRole, setUsuarioRole] = useState("");
  const podeCriar = ["adm", "admin", "aux_adm", "supervisora"].includes(usuarioRole);
  const isAdmOverride = ["adm", "admin"].includes(usuarioRole);

  const [minhaAssinatura, setMinhaAssinatura] = useState<string | null>(null);

  const [novoTexto, setNovoTexto] = useState("");
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [novaFotoPreview, setNovaFotoPreview] = useState<string | null>(null);
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [erroItem, setErroItem] = useState("");
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [editandoItemId, setEditandoItemId] = useState<string | null>(null);
  const [textoEditando, setTextoEditando] = useState("");

  const [assinandoId, setAssinandoId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState("");

  const [iniciandoDia, setIniciandoDia] = useState(false);

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
      .select("*, ocorrencias_diarias_itens(*)")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });

    const lista = (data ?? []).map((o: any) => ({
      ...o,
      itens: (o.ocorrencias_diarias_itens ?? []).sort(
        (a: Item, b: Item) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    })) as Ocorrencia[];
    setOcorrencias(lista);
    setLoading(false);
  }

  const meuDiaAberto = ocorrencias.find(
    (o) => o.data === hoje() && o.autor_email === usuarioEmail && !o.assinado_em
  );

  const meusAbertos = ocorrencias
    .filter((o) => o.autor_email === usuarioEmail && !o.assinado_em)
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  async function iniciarDia() {
    setIniciandoDia(true);
    await supabase.from("ocorrencias_diarias").insert({
      data: hoje(), autor_email: usuarioEmail, autor_nome: usuarioNome || null,
    });
    setIniciandoDia(false);
    carregar();
  }

  async function adicionarItem() {
    if (!meuDiaAberto || !novoTexto.trim()) { setErroItem("Escreva o que aconteceu."); return; }
    setSalvandoItem(true);
    setErroItem("");

    let foto_url: string | null = null;
    if (novaFoto) {
      const ext = novaFoto.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("ocorrencias-fotos").upload(path, novaFoto);
      if (!upErr) foto_url = supabase.storage.from("ocorrencias-fotos").getPublicUrl(path).data.publicUrl;
    }

    const { data: novo, error } = await supabase.from("ocorrencias_diarias_itens").insert({
      ocorrencia_id: meuDiaAberto.id, texto: novoTexto.trim(), foto_url,
    }).select().single();

    setSalvandoItem(false);
    if (error) { setErroItem(error.message); return; }

    await registrarLog(supabase, {
      usuario_email: usuarioEmail, usuario_nome: usuarioNome, acao: "Registrou ocorrência diária",
      tabela: "ocorrencias_diarias_itens", registro_id: novo?.id, descricao: novoTexto.trim().slice(0, 120),
    });

    setNovoTexto(""); setNovaFoto(null); setNovaFotoPreview(null);
    carregar();
  }

  function iniciarEdicaoItem(item: Item) {
    setEditandoItemId(item.id);
    setTextoEditando(item.texto);
  }

  async function salvarEdicaoItem(itemId: string) {
    if (!textoEditando.trim()) return;
    await supabase.from("ocorrencias_diarias_itens").update({ texto: textoEditando.trim() }).eq("id", itemId);
    setEditandoItemId(null);
    carregar();
  }

  async function excluirItem(itemId: string) {
    if (!confirm("Excluir esta ocorrência?")) return;
    await supabase.from("ocorrencias_diarias_itens").delete().eq("id", itemId);
    carregar();
  }

  async function excluirDia(ocorrenciaId: string, autorNome: string | null, data: string) {
    if (!confirm(`Excluir todo o registro de ${autorNome || "?"} do dia ${formatarData(data)}? Isso não pode ser desfeito.`)) return;
    await supabase.from("ocorrencias_diarias").delete().eq("id", ocorrenciaId);
    carregar();
  }

  async function assinar(ocorrencia: Ocorrencia, imagemBase64: string) {
    setConfirmando(true);
    setErroAssinatura("");
    await supabase.from("assinaturas").upsert({
      email: usuarioEmail, nome: usuarioNome || null, imagem_base64: imagemBase64, atualizado_em: new Date().toISOString(),
    });
    const { error } = await supabase.from("ocorrencias_diarias").update({
      assinatura_base64: imagemBase64, assinado_em: new Date().toISOString(),
    }).eq("id", ocorrencia.id);
    setConfirmando(false);
    if (error) { setErroAssinatura("Não foi possível assinar. Tente novamente."); return; }

    await supabase.from("notificacoes").insert({
      destinatario_role: "gestao",
      titulo: "📓 Ocorrência diária fechada",
      mensagem: `${usuarioNome || usuarioEmail} registrou ${ocorrencia.itens.length} ocorrência${ocorrencia.itens.length !== 1 ? "s" : ""} em ${formatarData(ocorrencia.data)}`,
      tipo: "ocorrencia",
      link: "/ocorrencias",
      autor_nome: usuarioNome || null,
    });

    setMinhaAssinatura(imagemBase64);
    setAssinandoId(null);
    carregar();
  }

  function formatarData(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const historico = ocorrencias.filter((o) => !meusAbertos.includes(o));
  const historicoFiltrado = historico.filter((o) =>
    o.itens.some((i) => i.texto.toLowerCase().includes(busca.toLowerCase())) ||
    (o.autor_nome || "").toLowerCase().includes(busca.toLowerCase()) ||
    o.data.includes(busca)
  );

  function propsItem(item: Item) {
    return {
      item,
      editando: editandoItemId === item.id,
      textoEditando,
      onTextoChange: setTextoEditando,
      onSalvarEdicao: () => salvarEdicaoItem(item.id),
      onCancelarEdicao: () => setEditandoItemId(null),
      onIniciarEdicao: () => iniciarEdicaoItem(item),
      onExcluir: () => excluirItem(item.id),
    };
  }

  return (
    <>
      <div className="print:hidden min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">📓 Ocorrência Diária</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {podeCriar ? "Registre acontecimentos fora da normalidade do dia a dia." : "Acompanhamento das ocorrências registradas pela administração."}
            </p>
            <p className="text-xs font-semibold text-amber-600 mt-1">
              ⚠️ As ocorrências diárias antes de 22/07/2026 estão registradas em livro físico.
            </p>
          </div>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors self-start">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>

        {/* DIAS EM ABERTO (hoje e qualquer dia anterior esquecido, ainda não assinado) */}
        {podeCriar && (
          <>
            {meusAbertos.map((o) => {
              const ehHoje = o.id === meuDiaAberto?.id;
              return (
                <div key={o.id} className="bg-white border-2 border-blue-200 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                      {ehHoje ? "Hoje — " : ""}{formatarData(o.data)}
                    </p>
                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-full whitespace-nowrap">
                      Ainda não assinado
                    </span>
                  </div>

                  {o.itens.length === 0 ? (
                    <p className="text-sm text-slate-400 py-3">Nenhuma ocorrência adicionada ainda.</p>
                  ) : (
                    <div className="mt-2">
                      {o.itens.map((item) => <CardItem key={item.id} {...propsItem(item)} editavel />)}
                    </div>
                  )}

                  {ehHoje && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <textarea rows={3} placeholder="Descreva uma nova ocorrência..." value={novoTexto}
                        onChange={(e) => setNovoTexto(e.target.value)} className={`${inputClass} resize-none`} />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => inputFotoRef.current?.click()}
                            className="flex items-center gap-2 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-slate-50 transition">
                            <Camera className="h-4 w-4" /> {novaFotoPreview ? "Trocar foto" : "Adicionar foto"}
                          </button>
                          {novaFotoPreview && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={novaFotoPreview} alt="Prévia" className="h-9 w-9 rounded-lg object-cover border border-slate-200" />
                          )}
                          <input ref={inputFotoRef} type="file" accept="image/*" capture="environment" className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) { setNovaFoto(f); setNovaFotoPreview(URL.createObjectURL(f)); }
                            }} />
                        </div>
                        <button onClick={adicionarItem} disabled={salvandoItem || !novoTexto.trim()}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50">
                          <Plus className="h-4 w-4" /> {salvandoItem ? "Adicionando..." : "Adicionar ocorrência"}
                        </button>
                      </div>
                      {erroItem && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroItem}</p>}
                    </div>
                  )}

                  <div className="mt-5 pt-5 border-t border-slate-200">
                    {o.itens.length === 0 ? (
                      <p className="text-xs text-slate-400">Adicione ao menos uma ocorrência para poder assinar e fechar o dia.</p>
                    ) : assinandoId === o.id ? (
                      <div className="max-w-sm">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assinar e fechar o dia</p>
                        <AssinaturaPad salvando={confirmando} onSalvar={(img) => assinar(o, img)} />
                        {erroAssinatura && <p className="text-[11px] text-red-600 mt-2">{erroAssinatura}</p>}
                      </div>
                    ) : minhaAssinatura ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={minhaAssinatura} alt="Sua assinatura salva" className="h-9 border-b border-slate-300 self-start" />
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button onClick={() => assinar(o, minhaAssinatura)} disabled={confirmando}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 text-left">
                            {confirmando ? "Confirmando..." : "Confirmar com minha assinatura e fechar o dia"}
                          </button>
                          <button onClick={() => setAssinandoId(o.id)} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">
                            Assinar de novo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAssinandoId(o.id)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800">
                        <PenLine className="h-4 w-4" /> Assinar e fechar o dia
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {meusAbertos.length === 0 ? (
              <button onClick={iniciarDia} disabled={iniciandoDia}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 text-slate-500 text-sm font-semibold py-5 rounded-2xl hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition disabled:opacity-50">
                <Plus className="h-4 w-4" /> {iniciandoDia ? "Iniciando..." : "Começar ocorrências de hoje"}
              </button>
            ) : !meuDiaAberto && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                ⚠️ Você tem um dia anterior sem assinar. Assine-o antes de começar um novo registro.
              </p>
            )}
          </>
        )}

        {/* HISTÓRICO */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input type="text" placeholder="Buscar por texto, autor ou data (aaaa-mm-dd)..." value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full sm:w-96 rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 transition" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
        ) : historicoFiltrado.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <span className="text-5xl">📓</span>
            <p className="text-sm text-slate-400 mt-2">{busca ? "Nenhuma ocorrência encontrada." : "Nenhum outro dia registrado ainda."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historicoFiltrado.map((o) => (
              <div key={o.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">{formatarData(o.data)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Registrado por {o.autor_nome || o.autor_email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {o.assinado_em ? (
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-full whitespace-nowrap">
                        ✓ Assinado
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-full whitespace-nowrap">
                        Em aberto
                      </span>
                    )}
                    {isAdmOverride && (
                      <button onClick={() => excluirDia(o.id, o.autor_nome, o.data)} title="Excluir este dia"
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  {o.itens.map((item) => (
                    <CardItem key={item.id} {...propsItem(item)} editavel={o.autor_email === usuarioEmail && !o.assinado_em} />
                  ))}
                </div>

                {o.assinatura_base64 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.assinatura_base64} alt={`Assinatura de ${o.autor_nome}`} className="h-10" />
                    <p className="text-[10px] text-slate-400 border-t border-slate-300 pt-1 mt-0.5 w-fit min-w-[140px]">
                      {o.autor_nome} — assinado em {new Date(o.assinado_em!).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VERSÃO PRA IMPRIMIR */}
      <div className="hidden print:block p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Ocorrência Diária — Clínica Abraço</h1>
        <p className="text-xs text-slate-400 mb-6">
          {ocorrencias.length} dia{ocorrencias.length !== 1 ? "s" : ""} registrado{ocorrencias.length !== 1 ? "s" : ""}
        </p>
        <div className="space-y-6">
          {ocorrencias.map((o) => (
            <div key={o.id} className="pb-4 border-b border-slate-300 break-inside-avoid">
              <p className="text-xs font-bold uppercase tracking-wide">{formatarData(o.data)} — {o.autor_nome || o.autor_email}</p>
              {o.itens.map((item) => (
                <p key={item.id} className="text-sm mt-1 whitespace-pre-wrap">
                  <span className="font-mono text-[11px] text-slate-500">{formatarHora(item.created_at)} — </span>{item.texto}
                </p>
              ))}
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
