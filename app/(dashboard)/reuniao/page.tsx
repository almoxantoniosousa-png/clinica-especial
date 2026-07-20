"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { registrarLog } from "@/lib/auditoria";
import { Calendar, Plus, X, Printer, Trash2, Users, Paperclip, Upload, CheckCircle2, PenLine } from "lucide-react";
import { AssinaturaPad } from "@/components/assinatura-pad";

type ItemAcao = { causa: string; acao: string; responsavel: string; prazo: string };

type Reuniao = {
  id: string;
  titulo: string;
  data: string;
  hora: string | null;
  data_proxima_reuniao: string | null;
  participantes: string[];
  participantes_nomes: string[];
  participantes_emails: (string | null)[];
  pontos_anteriores: string | null;
  pontos_atencao: string | null;
  itens_acao: ItemAcao[];
  criado_por_email: string;
  criado_por_nome: string | null;
  created_at: string;
};

type Pessoa = { email: string; nome: string; role: string };
type Anexo = { path: string; nome: string; url: string };
type Confirmacao = { email: string; nome: string | null; imagem_base64: string; confirmado_em: string };

const ROLE_LABEL: Record<string, string> = {
  adm: "ADM / Administração",
  admin: "ADM / Administração",
  gestao: "Gestão",
  supervisora: "Supervisora",
  especialista: "Especialistas",
  atendente: "Acompanhantes (AT)",
  at: "Acompanhantes (AT)",
  aux_adm: "Auxiliar Administrativo",
  financeiro: "Financeiro",
};
const ORDEM_ROLES = ["adm", "gestao", "supervisora", "especialista", "atendente", "aux_adm", "financeiro"];

const ITEM_ACAO_VAZIO: ItemAcao = { causa: "", acao: "", responsavel: "", prazo: "" };
const FORM_VAZIO = {
  titulo: "",
  data: new Date().toISOString().slice(0, 10),
  hora: "",
  dataProximaReuniao: "",
  pessoasSelecionadas: [] as string[],
  avulsos: [] as { nome: string; role: string }[],
  pontosAnteriores: "",
  pontosAtencao: "",
  itensAcao: [{ ...ITEM_ACAO_VAZIO }] as ItemAcao[],
};

export default function ReuniaoPage() {
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [usuarioNome, setUsuarioNome] = useState("");
  const [usuarioRole, setUsuarioRole] = useState("");

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<Reuniao | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [carregandoAnexos, setCarregandoAnexos] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);

  const [minhaAssinatura, setMinhaAssinatura] = useState<string | null>(null);
  const [confirmacoes, setConfirmacoes] = useState<Confirmacao[]>([]);
  const [desenhandoAssinatura, setDesenhandoAssinatura] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [novoAvulso, setNovoAvulso] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    async function identificar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      setUsuarioEmail(user.email);
      const { data: u } = await supabase.from("usuarios").select("role, nome").eq("email", user.email).maybeSingle();
      if (u?.role) {
        setUsuarioNome(u.nome || "");
        setUsuarioRole((u.role || "").toString().trim().toLowerCase());
        return;
      }
      const { data: a } = await supabase.from("atendentes").select("role, nome").eq("email", user.email).maybeSingle();
      setUsuarioNome(a?.nome || "");
      setUsuarioRole((a?.role || "").toString().trim().toLowerCase());
    }
    async function carregarMinhaAssinatura() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data } = await supabase.from("assinaturas").select("imagem_base64").eq("email", user.email).maybeSingle();
      setMinhaAssinatura(data?.imagem_base64 || null);
    }
    identificar();
    carregar();
    carregarPessoas();
    carregarMinhaAssinatura();
  }, []);

  async function carregarPessoas() {
    const { data } = await supabase.rpc("diretorio_equipe");
    const brutas = (data ?? []) as Pessoa[];
    const porEmail = new Map<string, Pessoa>();
    brutas.forEach(p => {
      const role = (p.role || "").toString().trim().toLowerCase();
      if (!role || !p.email || porEmail.has(p.email)) return;
      porEmail.set(p.email, { email: p.email, nome: p.nome || p.email, role });
    });
    setPessoas(Array.from(porEmail.values()).sort((a, b) => a.nome.localeCompare(b.nome)));
  }

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from("reunioes").select("*").order("data", { ascending: false }).order("created_at", { ascending: false });
    setReunioes((data ?? []) as Reuniao[]);
    setLoading(false);
  }

  async function carregarAnexos(reuniaoId: string) {
    setCarregandoAnexos(true);
    const { data } = await supabase.storage.from("reuniao-anexos").list(reuniaoId);
    const arquivos = (data ?? []).filter(f => f.name);
    const comUrl = await Promise.all(arquivos.map(async f => {
      const path = `${reuniaoId}/${f.name}`;
      const { data: assinado } = await supabase.storage.from("reuniao-anexos").createSignedUrl(path, 3600);
      return { path, nome: f.name, url: assinado?.signedUrl || "" };
    }));
    setAnexos(comUrl);
    setCarregandoAnexos(false);
  }

  async function carregarConfirmacoes(reuniaoId: string) {
    const { data } = await supabase.from("reunioes_confirmacoes").select("email, nome, imagem_base64, confirmado_em").eq("reuniao_id", reuniaoId);
    setConfirmacoes((data ?? []) as Confirmacao[]);
  }

  function abrirAta(r: Reuniao) {
    if (aberta?.id === r.id) { setAberta(null); setAnexos([]); setConfirmacoes([]); setDesenhandoAssinatura(false); return; }
    setAberta(r);
    setDesenhandoAssinatura(false);
    carregarAnexos(r.id);
    carregarConfirmacoes(r.id);
  }

  async function confirmarAta(reuniaoId: string, imagemBase64: string) {
    setConfirmando(true);
    setErroAssinatura("");
    await supabase.from("assinaturas").upsert({ email: usuarioEmail, nome: usuarioNome || null, imagem_base64: imagemBase64, atualizado_em: new Date().toISOString() });
    const { error } = await supabase.from("reunioes_confirmacoes").upsert({
      reuniao_id: reuniaoId, email: usuarioEmail, nome: usuarioNome || null, imagem_base64: imagemBase64,
    }, { onConflict: "reuniao_id,email" });
    setConfirmando(false);
    if (error) { setErroAssinatura("Não foi possível confirmar. Tente novamente."); return; }
    setMinhaAssinatura(imagemBase64);
    setDesenhandoAssinatura(false);
    await registrarLog(supabase, {
      usuario_email: usuarioEmail, usuario_nome: usuarioNome, acao: "Assinou ata de reunião",
      tabela: "reunioes", registro_id: reuniaoId,
    });
    carregarConfirmacoes(reuniaoId);
  }

  async function enviarAnexo(reuniaoId: string, file: File) {
    setEnviandoAnexo(true);
    const path = `${reuniaoId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("reuniao-anexos").upload(path, file);
    setEnviandoAnexo(false);
    if (!error) carregarAnexos(reuniaoId);
  }

  async function excluirAnexo(path: string, reuniaoId: string) {
    await supabase.storage.from("reuniao-anexos").remove([path]);
    carregarAnexos(reuniaoId);
  }

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setErro("");
    setModalAberto(true);
  }

  function togglePessoa(email: string) {
    setForm(f => ({
      ...f,
      pessoasSelecionadas: f.pessoasSelecionadas.includes(email)
        ? f.pessoasSelecionadas.filter(e => e !== email)
        : [...f.pessoasSelecionadas, email],
    }));
  }

  function adicionarAvulso(role: string) {
    const nome = (novoAvulso[role] || "").trim();
    if (!nome) return;
    setForm(f => ({ ...f, avulsos: [...f.avulsos, { nome, role }] }));
    setNovoAvulso(prev => ({ ...prev, [role]: "" }));
  }
  function removerAvulso(i: number) {
    setForm(f => ({ ...f, avulsos: f.avulsos.filter((_, idx) => idx !== i) }));
  }

  function atualizarItemAcao(i: number, campo: keyof ItemAcao, valor: string) {
    setForm(f => ({ ...f, itensAcao: f.itensAcao.map((item, idx) => idx === i ? { ...item, [campo]: valor } : item) }));
  }
  function adicionarItemAcao() {
    setForm(f => ({ ...f, itensAcao: [...f.itensAcao, { ...ITEM_ACAO_VAZIO }] }));
  }
  function removerItemAcao(i: number) {
    setForm(f => ({ ...f, itensAcao: f.itensAcao.filter((_, idx) => idx !== i) }));
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.data || (form.pessoasSelecionadas.length === 0 && form.avulsos.length === 0)) {
      setErro("Preencha título, data e pelo menos um participante.");
      return;
    }
    setSalvando(true);
    setErro("");

    const pessoasEscolhidas = pessoas.filter(p => form.pessoasSelecionadas.includes(p.email));
    const rolesParticipantes = Array.from(new Set(
      pessoasEscolhidas.map(p => p.role)
        .concat(form.avulsos.map(a => a.role))
        .concat(usuarioRole ? [usuarioRole] : [])
        .filter(Boolean)
    ));

    // Nome e e-mail de cada participante lado a lado (email = null pra quem não tem conta própria),
    // pra casar a confirmação com precisão em vez de comparar só o texto do nome.
    const detalhesParticipantes: { nome: string; email: string | null }[] = [
      ...pessoasEscolhidas.map(p => ({ nome: p.nome, email: p.email })),
      ...form.avulsos.map(a => ({ nome: a.nome, email: null })),
    ];
    if (usuarioNome && !form.pessoasSelecionadas.includes(usuarioEmail)) {
      detalhesParticipantes.push({ nome: usuarioNome, email: usuarioEmail });
    }
    const vistos = new Set<string>();
    const detalhesUnicos = detalhesParticipantes.filter(d => {
      const chave = d.email || d.nome;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
    const nomesParticipantes = detalhesUnicos.map(d => d.nome);
    const emailsParticipantes = detalhesUnicos.map(d => d.email);
    const itensAcaoValidos = form.itensAcao.filter(i => i.causa.trim() || i.acao.trim() || i.responsavel.trim() || i.prazo.trim());

    const { data: inserida, error } = await supabase.from("reunioes").insert({
      titulo: form.titulo.trim(),
      data: form.data,
      hora: form.hora || null,
      data_proxima_reuniao: form.dataProximaReuniao || null,
      participantes: rolesParticipantes,
      participantes_nomes: nomesParticipantes,
      participantes_emails: emailsParticipantes,
      pontos_anteriores: form.pontosAnteriores.trim() || null,
      pontos_atencao: form.pontosAtencao.trim() || null,
      itens_acao: itensAcaoValidos,
      criado_por_email: usuarioEmail,
      criado_por_nome: usuarioNome || null,
    }).select("id").single();

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    await registrarLog(supabase, {
      usuario_email: usuarioEmail, usuario_nome: usuarioNome, acao: "Registrou ata de reunião",
      tabela: "reunioes", registro_id: inserida?.id, descricao: `${form.titulo} (${form.data})`,
    });

    const rolesParaAvisar = rolesParticipantes.filter(r => r !== usuarioRole);
    if (rolesParaAvisar.length > 0) {
      await supabase.from("notificacoes").insert(
        rolesParaAvisar.map(role => ({
          destinatario_role: role,
          titulo: "🗒️ Nova ata de reunião",
          mensagem: form.titulo.trim(),
          tipo: "reuniao",
          link: "/reuniao",
          autor_nome: usuarioNome || null,
        }))
      );
    }

    setModalAberto(false);
    carregar();
  }

  async function excluir() {
    if (!deletandoId) return;
    setExcluindo(true);
    const { error } = await supabase.from("reunioes").delete().eq("id", deletandoId);
    setExcluindo(false);
    if (error) return;
    setReunioes(prev => prev.filter(r => r.id !== deletandoId));
    if (aberta?.id === deletandoId) { setAberta(null); setAnexos([]); }
    setDeletandoId(null);
  }

  const pessoasPorRole = ORDEM_ROLES.map(role => ({
    role,
    label: ROLE_LABEL[role],
    pessoas: pessoas.filter(p => p.role === role),
  }));

  // Casa cada participante com a confirmação dele — por e-mail quando a ata
  // já guarda isso (mais confiável), com o nome como reserva pra atas antigas.
  function participantesComConfirmacao(r: Reuniao) {
    return r.participantes_nomes.map((nome, i) => {
      const email = r.participantes_emails?.[i] ?? null;
      const conf = confirmacoes.find(c => (email ? c.email === email : c.nome === nome));
      return { nome, email, conf };
    });
  }

  return (
    <div className="space-y-6">
    <div className="print:hidden space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Reunião
          </h1>
          <p className="text-sm text-slate-400 mt-1">Atas arquivadas — cada uma só aparece pra quem participou</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Plus className="h-4 w-4" />
          Nova ata
        </button>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>
      ) : reunioes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="h-10 w-10 mx-auto opacity-30 mb-2" />
          <p className="text-sm">Nenhuma ata registrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reunioes.map(r => {
            const abertaAqui = aberta?.id === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => abrirAta(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left">
                  <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}{r.hora ? ` às ${r.hora}` : ""} · {r.participantes_nomes.join(", ")}
                    </p>
                  </div>
                </button>
                {abertaAqui && (
                  <div className="p-4 space-y-4">
                    {r.data_proxima_reuniao && (
                      <p className="text-xs text-slate-500">
                        <strong>Próxima reunião:</strong> {new Date(r.data_proxima_reuniao + "T12:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {r.pontos_anteriores && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Pontos discutidos anteriormente</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.pontos_anteriores}</p>
                      </div>
                    )}
                    {r.pontos_atencao && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Pontos de atenção até a próxima reunião</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.pontos_atencao}</p>
                      </div>
                    )}
                    {r.itens_acao.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Plano de ação</p>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="px-2 py-1.5 text-left border-b border-slate-200">Análise de causa</th>
                                <th className="px-2 py-1.5 text-left border-b border-l border-slate-200">Plano de ação</th>
                                <th className="px-2 py-1.5 text-left border-b border-l border-slate-200">Responsável</th>
                                <th className="px-2 py-1.5 text-left border-b border-l border-slate-200">Prazo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.itens_acao.map((item, i) => (
                                <tr key={i}>
                                  <td className="px-2 py-1.5 border-b border-slate-100 align-top">{item.causa}</td>
                                  <td className="px-2 py-1.5 border-b border-l border-slate-100 align-top">{item.acao}</td>
                                  <td className="px-2 py-1.5 border-b border-l border-slate-100 align-top">{item.responsavel}</td>
                                  <td className="px-2 py-1.5 border-b border-l border-slate-100 align-top">{item.prazo}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ANEXOS */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Anexos</p>
                      {carregandoAnexos ? (
                        <p className="text-xs text-slate-400">Carregando...</p>
                      ) : (
                        <div className="space-y-1.5">
                          {anexos.map(a => (
                            <div key={a.path} className="flex items-center gap-2 text-xs">
                              <Paperclip className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{a.nome}</a>
                              {r.criado_por_email === usuarioEmail && (
                                <button onClick={() => excluirAnexo(a.path, r.id)} className="text-slate-400 hover:text-red-600 ml-auto">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {anexos.length === 0 && <p className="text-xs text-slate-400">Nenhum anexo.</p>}
                          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer mt-1">
                            <Upload className="h-3.5 w-3.5" />
                            {enviandoAnexo ? "Enviando..." : "Anexar arquivo (imagem ou PDF)"}
                            <input type="file" accept="image/*,application/pdf" className="hidden" disabled={enviandoAnexo}
                              onChange={e => { const f = e.target.files?.[0]; if (f) enviarAnexo(r.id, f); e.target.value = ""; }} />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* ASSINATURAS */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Assinaturas</p>
                      <div className="space-y-1.5">
                        {participantesComConfirmacao(r).map(({ nome, conf }) => {
                          return (
                            <div key={nome} className="flex items-center gap-2 text-xs">
                              {conf ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={conf.imagem_base64} alt={`Assinatura de ${nome}`} className="h-6 border-b border-slate-300" />
                                  <span className="text-slate-500">{nome} — {new Date(conf.confirmado_em).toLocaleDateString("pt-BR")}</span>
                                </>
                              ) : (
                                <>
                                  <span className="h-3.5 w-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                                  <span className="text-slate-400">{nome} — pendente</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {r.participantes.includes(usuarioRole) && !confirmacoes.some(c => c.email === usuarioEmail) && (
                        <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                          {!desenhandoAssinatura && minhaAssinatura ? (
                            <div className="space-y-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={minhaAssinatura} alt="Sua assinatura salva" className="h-10 border-b border-slate-300" />
                              <div className="flex gap-2">
                                <button onClick={() => confirmarAta(r.id, minhaAssinatura)} disabled={confirmando}
                                  className="flex-1 h-9 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50">
                                  {confirmando ? "Confirmando..." : "Confirmar com minha assinatura"}
                                </button>
                                <button onClick={() => setDesenhandoAssinatura(true)}
                                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 px-2">
                                  <PenLine className="h-3.5 w-3.5" />
                                  Assinar diferente
                                </button>
                              </div>
                            </div>
                          ) : (
                            <AssinaturaPad salvando={confirmando} onSalvar={(img) => confirmarAta(r.id, img)} />
                          )}
                          {erroAssinatura && <p className="text-[11px] text-red-600 mt-2">{erroAssinatura}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400">
                        Registrado por {r.criado_por_nome || r.criado_por_email}
                      </p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => window.print()}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 px-2 py-1">
                          <Printer className="h-3.5 w-3.5" />
                          Imprimir
                        </button>
                        {r.criado_por_email === usuarioEmail && (
                          <button onClick={() => setDeletandoId(r.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 px-2 py-1">
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-3xl">🗑️</div>
              <h3 className="font-bold text-slate-800">Remover esta ata?</h3>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} disabled={excluindo}
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={excluir} disabled={excluindo}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50">
                {excluindo ? "Removendo..." : "Sim, remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA ATA */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={(e) => { if (e.target === e.currentTarget) setModalAberto(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Nova ata de reunião</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Título</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Reunião de supervisão — Daniela"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Horário</label>
                  <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Próxima reunião</label>
                  <input type="date" value={form.dataProximaReuniao} onChange={e => setForm(f => ({ ...f, dataProximaReuniao: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Participantes da reunião</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2">
                  {pessoasPorRole.map(grupo => (
                    <div key={grupo.role}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">{grupo.label}</p>
                      <div className="flex flex-wrap gap-1.5 px-1 py-1 items-center">
                        {grupo.pessoas.map(p => (
                          <button key={p.email} type="button" onClick={() => togglePessoa(p.email)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                              form.pessoasSelecionadas.includes(p.email) ? "bg-blue-600 text-white border-blue-600" : "text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}>
                            {p.nome}
                          </button>
                        ))}
                        {form.avulsos.map((a, i) => a.role === grupo.role && (
                          <span key={`avulso-${i}`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white">
                            {a.nome}
                            <button type="button" onClick={() => removerAvulso(i)} className="hover:text-blue-200">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center gap-1">
                          <input value={novoAvulso[grupo.role] || ""} onChange={e => setNovoAvulso(prev => ({ ...prev, [grupo.role]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); adicionarAvulso(grupo.role); } }}
                            placeholder="+ nome (sem login próprio)"
                            className="h-7 px-2 rounded-lg border border-dashed border-slate-300 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <button type="button" onClick={() => adicionarAvulso(grupo.role)}
                            className="h-7 px-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50">
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Só quem participar vai enxergar essa ata.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pontos discutidos anteriormente (opcional)</label>
                <textarea value={form.pontosAnteriores} onChange={e => setForm(f => ({ ...f, pontosAnteriores: e.target.value }))}
                  rows={3} placeholder="Retomada da reunião passada..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pontos de atenção até a próxima reunião (opcional)</label>
                <textarea value={form.pontosAtencao} onChange={e => setForm(f => ({ ...f, pontosAtencao: e.target.value }))}
                  rows={3} placeholder="O que precisa ser acompanhado até o próximo encontro..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Plano de ação (opcional)</label>
                <div className="space-y-2">
                  {form.itensAcao.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5 items-start">
                      <input value={item.causa} onChange={e => atualizarItemAcao(i, "causa", e.target.value)}
                        placeholder="Análise de causa"
                        className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={item.acao} onChange={e => atualizarItemAcao(i, "acao", e.target.value)}
                        placeholder="Plano de ação"
                        className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={item.responsavel} onChange={e => atualizarItemAcao(i, "responsavel", e.target.value)}
                        placeholder="Responsável"
                        className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={item.prazo} onChange={e => atualizarItemAcao(i, "prazo", e.target.value)}
                        placeholder="Prazo (ex: 7 dias)"
                        className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button type="button" onClick={() => removerItemAcao(i)}
                        className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={adicionarItemAcao}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                    + Adicionar item
                  </button>
                </div>
              </div>

              {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
                {salvando ? "Salvando..." : "Salvar ata"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* VERSÃO PRA IMPRIMIR */}
    {aberta && (
      <div className="hidden print:block">
        <h1 className="text-xl font-bold text-slate-900">{aberta.titulo}</h1>
        <p className="text-sm text-slate-500 mb-1">
          {new Date(aberta.data + "T12:00:00").toLocaleDateString("pt-BR")}{aberta.hora ? ` às ${aberta.hora}` : ""}
          {aberta.data_proxima_reuniao && <> — Próxima reunião: {new Date(aberta.data_proxima_reuniao + "T12:00:00").toLocaleDateString("pt-BR")}</>}
        </p>
        <p className="text-xs text-slate-400 mb-4">Participantes: {aberta.participantes_nomes.join(", ")}</p>
        {aberta.pontos_anteriores && (
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-1">Pontos discutidos anteriormente</p>
            <p className="text-sm whitespace-pre-wrap">{aberta.pontos_anteriores}</p>
          </div>
        )}
        {aberta.pontos_atencao && (
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-1">Pontos de atenção até a próxima reunião</p>
            <p className="text-sm whitespace-pre-wrap">{aberta.pontos_atencao}</p>
          </div>
        )}
        {aberta.itens_acao.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-1">Plano de ação</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left">Análise de causa</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Plano de ação</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Responsável</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {aberta.itens_acao.map((item, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1">{item.causa}</td>
                    <td className="border border-slate-300 px-2 py-1">{item.acao}</td>
                    <td className="border border-slate-300 px-2 py-1">{item.responsavel}</td>
                    <td className="border border-slate-300 px-2 py-1">{item.prazo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-8">Registrado por {aberta.criado_por_nome || aberta.criado_por_email}</p>
        <div className="mt-10 pt-8 border-t border-slate-300">
          <p className="text-xs font-bold uppercase tracking-wide mb-6">Assinaturas dos participantes</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-8">
            {participantesComConfirmacao(aberta).map(({ nome, conf }) => {
              return (
                <div key={nome} className="text-center">
                  {conf ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conf.imagem_base64} alt={`Assinatura de ${nome}`} className="h-12 mx-auto" />
                  ) : (
                    <div className="h-12" />
                  )}
                  <div className="border-t border-slate-400 pt-1 text-xs">
                    {nome}{conf && <> — assinado em {new Date(conf.confirmado_em).toLocaleDateString("pt-BR")}</>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
