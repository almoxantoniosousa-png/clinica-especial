"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Aba = "diario" | "comunicados" | "momentos" | "evolucao";

export default function FamiliaDashboardPage() {
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("diario");
  const [responsavel, setResponsavel] = useState<any>(null);
  const [crianca, setCrianca] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      // Usa o singleton para pegar o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      console.log("User logado:", user?.email);
      if (!user) { setLoading(false); return; }

      // Busca o responsável pelo email
      const { data: resp, error } = await supabaseClient
        .from("responsaveis")
        .select("*, criancas(id, nome, foto_url, diagnostico, data_nascimento)")
        .eq("email", user.email)
        .eq("ativo", true)
        .maybeSingle();

      console.log("Responsavel:", resp);
      console.log("Erro:", error);

      if (resp) {
        setResponsavel(resp);
        setCrianca(resp.criancas);
      }
      setLoading(false);
    }
    carregar();
  }, []);

  const abas = [
    { id: "diario",      label: "Diário",    icon: "📋" },
    { id: "comunicados", label: "Avisos",    icon: "📢" },
    { id: "momentos",    label: "Momentos",  icon: "📸" },
    { id: "evolucao",    label: "Evolução",  icon: "📊" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p className="text-slate-400 text-sm">Carregando portal...</p>
        </div>
      </div>
    );
  }

  if (!crianca) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">👶</span>
          </div>
          <h2 className="font-bold text-slate-800 text-lg">Portal não configurado</h2>
          <p className="text-slate-500 text-sm">Seu acesso ainda não foi vinculado a uma criança. Entre em contato com a clínica.</p>
        </div>
      </div>
    );
  }

  function calcularIdade(dataNasc: string) {
    if (!dataNasc) return null;
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    const anos = hoje.getFullYear() - nasc.getFullYear();
    if (anos === 0) {
      const meses = hoje.getMonth() - nasc.getMonth();
      return `${meses} meses`;
    }
    return `${anos} anos`;
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* HEADER DA CRIANÇA */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 px-4 pt-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
              {crianca.foto_url
                ? <img src={crianca.foto_url} alt={crianca.nome} className="w-full h-full object-cover"/>
                : <div className="w-full h-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-xl">
                    {crianca.nome?.charAt(0)}
                  </div>}
            </div>
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Portal da Família</p>
              <h1 className="text-white text-xl font-bold">{crianca.nome}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {crianca.data_nascimento && (
                  <span className="text-blue-200 text-xs">{calcularIdade(crianca.data_nascimento)}</span>
                )}
                {crianca.diagnostico && (
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{crianca.diagnostico}</span>
                )}
              </div>
            </div>
          </div>

          {/* Saudação */}
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-3">
            <p className="text-white text-sm">
              Olá, <span className="font-semibold">{responsavel?.nome?.split(" ")[0]}</span>! 👋
              Acompanhe aqui o dia a dia de <span className="font-semibold">{crianca.nome?.split(" ")[0]}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div className="max-w-lg mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-1.5 flex gap-1">
          {abas.map(a => (
            <button key={a.id} onClick={() => setAba(a.id as Aba)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${aba === a.id ? "bg-blue-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {aba === "diario"      && <AbaDiario    criancaId={crianca.id} />}
        {aba === "comunicados" && <AbaAvisos    criancaId={crianca.id} />}
        {aba === "momentos"    && <AbaMomentos  criancaId={crianca.id} />}
        {aba === "evolucao"    && <AbaEvolucao  criancaId={crianca.id} />}
      </div>
    </div>
  );
}

// =============================================
// ABA DIÁRIO — comunicados diários enviados pela supervisora
// =============================================
function AbaDiario({ criancaId }: { criancaId: string }) {
  const supabase2 = useMemo(() => createSupabaseBrowserClient(), []);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<any | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data } = await supabase2
        .from("formularios_escolares")
        .select("*")
        .eq("crianca_id", criancaId)
        .eq("enviado_familia", true)
        .order("data", { ascending: false });
      setDiarios(data || []);
      setLoading(false);
    };
    carregar();
  }, [criancaId]);

  const autonomiaLabel: Record<number, string> = {
    1: "Dependência Total",
    2: "Ajuda Física/Verbal",
    3: "Independência Parcial",
    4: "Independência Total",
  };

  function renderConteudo(d: any) {
    const secoes = [
      {
        titulo: "🏁 Chegada",
        itens: [
          d.hora_chegada && { label: "Horário", valor: d.hora_chegada },
          d.interacao?.length && { label: "Interação", valor: (d.interacao as string[]).join(" · ") },
        ].filter(Boolean),
      },
      {
        titulo: "🛠 Autonomia",
        itens: [
          d.autonomia_nivel && { label: "Independência", valor: autonomiaLabel[d.autonomia_nivel] || "" },
          d.idas_banheiro != null && { label: "Banheiro", valor: `${d.idas_banheiro} vez${d.idas_banheiro !== 1 ? "es" : ""}` },
          d.evacuou != null && { label: "Evacuou", valor: d.evacuou ? "Sim" : "Não" },
        ].filter(Boolean),
      },
      {
        titulo: "🏀 Recreio",
        itens: [
          d.socializacao?.length && { label: "Socialização", valor: (d.socializacao as string[]).join(" · ") },
          d.atencao?.length && { label: "Atenção", valor: (d.atencao as string[]).join(" · ") },
          d.lanche && { label: "Lanche", valor: `${d.lanche}${d.comeu_tudo ? " (comeu tudo)" : ""}` },
        ].filter(Boolean),
      },
      {
        titulo: "📖 Agenda",
        itens: [
          d.atividades_sala && { label: "Atividades", valor: d.atividades_sala },
          d.tarefa_casa && { label: "Tarefa de casa", valor: d.tarefa_casa },
          d.materiais_pedir && { label: "⚠️ Avisos urgentes", valor: d.materiais_pedir, alerta: true },
          d.obs_gerais && { label: "Observações", valor: d.obs_gerais },
        ].filter(Boolean),
      },
    ].filter(s => s.itens.length > 0);

    return (
      <div className="space-y-4">
        {secoes.map(s => (
          <div key={s.titulo}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{s.titulo}</p>
            <div className="space-y-2">
              {(s.itens as any[]).map((item: any) => (
                <div key={item.label}
                  className={`rounded-xl px-4 py-3 ${item.alerta ? "bg-red-50 border border-red-200" : "bg-slate-50 border border-slate-100"}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5 ${item.alerta ? 'text-red-500' : 'text-slate-400'}">{item.label}</p>
                  <p className={`text-sm leading-relaxed ${item.alerta ? "text-red-700 font-medium" : "text-slate-700"}`}>{item.valor}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {d.obs_supervisora && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-0.5">Observação da Supervisora</p>
            <p className="text-sm text-blue-800 leading-relaxed">{d.obs_supervisora}</p>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;

  if (diarios.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">📋</span>
      <p className="text-slate-400 text-sm mt-3">Nenhum comunicado diário ainda.</p>
      <p className="text-xs text-slate-300 mt-1">Os comunicados aparecerão aqui após revisão da supervisora.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {diarios.map(d => {
        const dataFormatada = new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
        const temUrgente = !!d.materiais_pedir;
        return (
          <div key={d.id} onClick={() => setDetalhe(d)}
            className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition border-l-4
              ${temUrgente ? "border-l-red-400 border-red-200" : "border-l-blue-400 border-slate-200"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${temUrgente ? "bg-red-100" : "bg-blue-100"}`}>
                  <span className="text-xl">{temUrgente ? "⚠️" : "📋"}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm capitalize">{dataFormatada}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {d.hora_chegada && <span className="text-xs text-slate-400">🕐 {d.hora_chegada}</span>}
                    {temUrgente && <span className="text-xs font-semibold text-red-600">⚠️ Aviso urgente</span>}
                  </div>
                </div>
              </div>
              <span className="text-slate-300 text-lg flex-shrink-0">›</span>
            </div>

            {/* preview das interações */}
            {d.interacao?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(d.interacao as string[]).slice(0, 3).map((i: string) => (
                  <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{i}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal detalhe */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-blue-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="font-bold text-white text-sm capitalize">
                  {new Date(detalhe.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <p className="text-blue-300 text-xs mt-0.5">Comunicado Diário</p>
              </div>
              <button onClick={() => setDetalhe(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {renderConteudo(detalhe)}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
              <button onClick={() => setDetalhe(null)}
                className="w-full h-11 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA AVISOS
// =============================================
function AbaAvisos({ criancaId }: { criancaId: string }) {
  const supabase2 = useMemo(() => createSupabaseBrowserClient(), []);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<any | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data } = await supabase2.from("portal_comunicados")
        .select("*").eq("crianca_id", criancaId).order("created_at", { ascending: false });
      setAvisos(data || []);
      setLoading(false);
    };
    carregar();
  }, [criancaId]);

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;

  if (avisos.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">📢</span>
      <p className="text-slate-400 text-sm mt-3">Nenhum aviso no momento.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {avisos.map(a => (
        <div key={a.id} onClick={() => setDetalhe(a)}
          className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3 cursor-pointer hover:border-blue-200 hover:shadow-sm transition border-l-4 border-l-amber-400">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg">📢</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
            {a.conteudo && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.conteudo}</p>}
            <p className="text-xs text-slate-300 mt-1">{new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <span className="text-slate-300 text-lg flex-shrink-0">›</span>
        </div>
      ))}

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">📢</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800">{detalhe.titulo}</p>
                  <p className="text-xs text-slate-400">{new Date(detalhe.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            {detalhe.conteudo && <p className="text-sm text-slate-700 leading-relaxed">{detalhe.conteudo}</p>}
            <button onClick={() => setDetalhe(null)}
              className="w-full h-11 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA MOMENTOS
// =============================================
function AbaMomentos({ criancaId }: { criancaId: string }) {
  const supabase2 = useMemo(() => createSupabaseBrowserClient(), []);
  const [momentos, setMomentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [foto, setFoto] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data } = await supabase2.from("portal_momentos")
        .select("*").eq("crianca_id", criancaId).order("created_at", { ascending: false });
      setMomentos(data || []);
      setLoading(false);
    };
    carregar();
  }, [criancaId]);

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;

  if (momentos.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">📸</span>
      <p className="text-slate-400 text-sm mt-3">Nenhuma foto compartilhada ainda.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {momentos.map(m => (
          <div key={m.id} onClick={() => setFoto(m.imagem_url)}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition">
            <img src={m.imagem_url} alt="Momento" className="w-full h-40 object-cover"/>
            <div className="p-2">
              {m.descricao && <p className="text-xs text-slate-600 truncate">{m.descricao}</p>}
              <p className="text-xs text-slate-300 mt-0.5">{new Date(m.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        ))}
      </div>

      {foto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={() => setFoto(null)}>
          <img src={foto} alt="Momento" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"/>
        </div>
      )}
    </div>
  );
}

// =============================================
// ABA EVOLUÇÃO
// =============================================
function AbaEvolucao({ criancaId }: { criancaId: string }) {
  const supabase2 = useMemo(() => createSupabaseBrowserClient(), []);
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<any | null>(null);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      const { data } = await supabase2.from("portal_evolucao")
        .select("*").eq("crianca_id", criancaId).order("created_at", { ascending: false });
      setEvolucoes(data || []);
      setLoading(false);
    };
    carregar();
  }, [criancaId]);

  if (loading) return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;

  if (evolucoes.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
      <span className="text-5xl">📊</span>
      <p className="text-slate-400 text-sm mt-3">Nenhum registro de evolução ainda.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {evolucoes.map(e => (
        <div key={e.id} onClick={() => setDetalhe(e)}
          className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3 cursor-pointer hover:border-blue-200 hover:shadow-sm transition border-l-4 border-l-blue-400">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg">📊</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 text-sm">{e.titulo}</p>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{e.conteudo}</p>
            <p className="text-xs text-slate-300 mt-1">{new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <span className="text-slate-300 text-lg flex-shrink-0">›</span>
        </div>
      ))}

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setDetalhe(null); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800">{detalhe.titulo}</p>
                  <p className="text-xs text-slate-400">{new Date(detalhe.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{detalhe.conteudo}</p>
            <button onClick={() => setDetalhe(null)}
              className="w-full h-11 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 transition">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}