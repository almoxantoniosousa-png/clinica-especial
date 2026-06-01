"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Aba = "comunicados" | "momentos" | "evolucao";

export default function FamiliaDashboardPage() {
  const supabaseClient = useMemo(() => createSupabaseBrowserClient(), []);
  const [aba, setAba] = useState<Aba>("comunicados");
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
        {aba === "comunicados" && <AbaAvisos criancaId={crianca.id} />}
        {aba === "momentos"    && <AbaMomentos criancaId={crianca.id} />}
        {aba === "evolucao"    && <AbaEvolucao criancaId={crianca.id} />}
      </div>
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