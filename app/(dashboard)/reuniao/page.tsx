"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { registrarLog } from "@/lib/auditoria";
import { Calendar, Plus, X, Printer, Trash2, Users } from "lucide-react";

type Reuniao = {
  id: string;
  titulo: string;
  data: string;
  conteudo: string;
  participantes: string[];
  criado_por_email: string;
  criado_por_nome: string | null;
  created_at: string;
};

type OpcaoParticipante = { label: string; roles: string[] };

const OPCOES_PARTICIPANTES: OpcaoParticipante[] = [
  { label: "ADM / Administração",        roles: ["adm", "admin"] },
  { label: "Gestão",                      roles: ["gestao"] },
  { label: "Supervisora",                 roles: ["supervisora"] },
  { label: "Especialistas",               roles: ["especialista"] },
  { label: "Acompanhantes (AT)",          roles: ["atendente", "at"] },
  { label: "Auxiliar Administrativo",     roles: ["aux_adm"] },
  { label: "Financeiro",                  roles: ["financeiro"] },
];

function labelParticipantes(roles: string[]) {
  const rolesSet = new Set(roles);
  return OPCOES_PARTICIPANTES
    .filter(o => o.roles.some(r => rolesSet.has(r)))
    .map(o => o.label)
    .join(", ");
}

const FORM_VAZIO = { titulo: "", data: new Date().toISOString().slice(0, 10), conteudo: "", participantes: [] as string[] };

export default function ReuniaoPage() {
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [usuarioNome, setUsuarioNome] = useState("");
  const [usuarioRole, setUsuarioRole] = useState("");

  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<Reuniao | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
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
    identificar();
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from("reunioes").select("*").order("data", { ascending: false }).order("created_at", { ascending: false });
    setReunioes((data ?? []) as Reuniao[]);
    setLoading(false);
  }

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setErro("");
    setModalAberto(true);
  }

  function alternarParticipante(label: string) {
    setForm(f => ({
      ...f,
      participantes: f.participantes.includes(label)
        ? f.participantes.filter(p => p !== label)
        : [...f.participantes, label],
    }));
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.data || !form.conteudo.trim() || form.participantes.length === 0) {
      setErro("Preencha título, data, conteúdo e pelo menos um participante.");
      return;
    }
    setSalvando(true);
    setErro("");

    const rolesSelecionados = new Set<string>();
    form.participantes.forEach(label => {
      const opcao = OPCOES_PARTICIPANTES.find(o => o.label === label);
      opcao?.roles.forEach(r => rolesSelecionados.add(r));
    });
    if (usuarioRole) rolesSelecionados.add(usuarioRole);

    const { error } = await supabase.from("reunioes").insert({
      titulo: form.titulo.trim(),
      data: form.data,
      conteudo: form.conteudo.trim(),
      participantes: Array.from(rolesSelecionados),
      criado_por_email: usuarioEmail,
      criado_por_nome: usuarioNome || null,
    });

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    await registrarLog(supabase, {
      usuario_email: usuarioEmail, usuario_nome: usuarioNome, acao: "Registrou ata de reunião",
      tabela: "reunioes", descricao: `${form.titulo} (${form.data})`,
    });

    // Avisa no sino quem participou (menos quem já sabe, por ter acabado de criar).
    const rolesParaAvisar = new Set<string>();
    form.participantes.forEach(label => {
      const opcao = OPCOES_PARTICIPANTES.find(o => o.label === label);
      opcao?.roles.forEach(r => { if (r !== usuarioRole) rolesParaAvisar.add(r); });
    });
    if (rolesParaAvisar.size > 0) {
      await supabase.from("notificacoes").insert(
        Array.from(rolesParaAvisar).map(role => ({
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
    if (aberta?.id === deletandoId) setAberta(null);
    setDeletandoId(null);
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
                <button onClick={() => setAberta(abertaAqui ? null : r)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left">
                  <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.titulo}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")} · {labelParticipantes(r.participantes)}
                    </p>
                  </div>
                </button>
                {abertaAqui && (
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.conteudo}</p>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
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
                  placeholder="Ex: Reunião de planejamento mensal"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data da reunião</label>
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quem participou</label>
                <div className="flex flex-wrap gap-2">
                  {OPCOES_PARTICIPANTES.map(o => (
                    <button key={o.label} type="button" onClick={() => alternarParticipante(o.label)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        form.participantes.includes(o.label) ? "bg-blue-600 text-white border-blue-600" : "text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Só quem participar vai enxergar essa ata.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Conteúdo da ata</label>
                <textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                  rows={8} placeholder="O que foi discutido, decisões tomadas, próximos passos..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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
        <p className="text-sm text-slate-500 mb-1">{new Date(aberta.data + "T12:00:00").toLocaleDateString("pt-BR")}</p>
        <p className="text-xs text-slate-400 mb-4">Participantes: {labelParticipantes(aberta.participantes)}</p>
        <p className="text-sm whitespace-pre-wrap">{aberta.conteudo}</p>
        <p className="text-xs text-slate-400 mt-6">Registrado por {aberta.criado_por_nome || aberta.criado_por_email}</p>
      </div>
    )}
    </div>
  );
}
