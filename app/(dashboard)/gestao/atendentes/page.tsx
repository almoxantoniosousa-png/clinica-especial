"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { Search } from "lucide-react";

const POR_PAGINA = 8;

export default function GestaoAcompanhantesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [acompanhantes, setAcompanhantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [visiveis, setVisiveis] = useState(POR_PAGINA);

  const carregar = async () => {
    setLoading(true); setErro("");
    const { data, error } = await supabase.from("atendentes").select("*").eq("role", "atendente").order("nome");
    if (error) { setErro("Erro ao carregar os acompanhantes: " + error.message); setLoading(false); return; }
    setAcompanhantes(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);
  useEffect(() => { setVisiveis(POR_PAGINA); }, [busca]);

  const filtrados = acompanhantes.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.especialidade || "").toLowerCase().includes(busca.toLowerCase())
  );
  const exibidos = filtrados.slice(0, visiveis);
  const temMais = visiveis < filtrados.length;

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
  }

  const coresAvatar = [
    "bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  ];

  function corAvatar(nome: string) { return coresAvatar[nome.charCodeAt(0) % coresAvatar.length]; }

  function abrirWhatsApp(tel: string, nome: string) {
    const num = tel.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${nome}! Clínica Abraço ABA aqui.`);
    window.open(`https://wa.me/55${num}?text=${msg}`, "_blank");
  }

  function abrirEmail(email: string) {
    window.open(`mailto:${email}`, "_blank");
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Acompanhantes Terapêuticos</h1>
          <p className="text-slate-500 text-sm mt-1">Visualização — somente leitura</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500"/>
          {acompanhantes.length} acompanhantes
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"/>
          <input type="text" placeholder="Buscar por nome ou especialidade..." value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
        </div>
        {busca && <span className="text-xs text-slate-400">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2"/>
          <span className="text-sm text-slate-400">Carregando...</span>
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <button onClick={carregar} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition">Tentar novamente</button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <span className="text-4xl">👤</span>
          <p className="text-sm mt-2">Nenhum acompanhante encontrado.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {exibidos.map(at => (
              <div key={at.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-full font-bold text-sm ${corAvatar(at.nome)}`}>
                    {iniciais(at.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{at.nome}</p>
                    <p className="text-xs text-slate-500">{at.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {at.especialidade && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{at.especialidade}</span>}
                      {at.data_nascimento && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Nasc: {new Date(at.data_nascimento).toLocaleDateString("pt-BR")}</span>}
                      {at.cpf && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">CPF: {at.cpf}</span>}
                    </div>
                    {at.endereco && <p className="text-xs text-slate-400 mt-1">📍 {at.endereco}</p>}

                    {/* Botões de contato */}
                    <div className="flex gap-2 mt-3">
                      {at.whatsapp ? (
                        <button onClick={() => abrirWhatsApp(at.whatsapp, at.nome)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition active:scale-95">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.302-1.506A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.189-1.427l-.371-.221-3.742.894.939-3.648-.242-.384A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                          </svg>
                          WhatsApp
                        </button>
                      ) : null}
                      {at.email ? (
                        <button onClick={() => abrirEmail(at.email)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition active:scale-95">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                          Email
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-slate-400">Mostrando {exibidos.length} de {filtrados.length}</p>
            {temMais && (
              <button onClick={() => setVisiveis(v => v + POR_PAGINA)}
                className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-700 transition">
                Ver mais {Math.min(POR_PAGINA, filtrados.length - visiveis)} →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
