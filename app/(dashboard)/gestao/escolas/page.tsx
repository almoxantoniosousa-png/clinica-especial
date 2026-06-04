"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabaseBrowserClient";
import { School, Search, Phone, MapPin, MessageCircle } from "lucide-react";

export default function GestaoEscolasPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    setLoading(true); setErro("");
    const { data, error } = await supabase.from("escolas").select("*").order("nome");
    if (error) { setErro("Erro ao carregar as escolas: " + error.message); setLoading(false); return; }
    setEscolas(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const filtradas = escolas.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (e.coordenacao || "").toLowerCase().includes(busca.toLowerCase()) ||
    (e.bairro || "").toLowerCase().includes(busca.toLowerCase())
  );

  function ligar(telefone: string) {
    window.open(`tel:${telefone.replace(/\D/g, "")}`, "_self");
  }

  function abrirWhatsApp(telefone: string, nomeEscola: string) {
    const num = telefone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Somos da Clínica Abraço ABA. Entramos em contato referente ao atendimento em ${nomeEscola}.`);
    window.open(`https://wa.me/55${num}?text=${msg}`, "_blank");
  }

  function abrirMaps(endereco: string, nome: string) {
    const q = encodeURIComponent(`${nome} ${endereco}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <School className="h-6 w-6 text-blue-600" />
            Escolas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Visualização — somente leitura</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-blue-500"/>
          {escolas.length} escola{escolas.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"/>
        <input type="text" placeholder="Buscar escola, coordenação..." value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"/>
          <span className="text-sm text-slate-400">Carregando...</span>
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <button onClick={carregar} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition">Tentar novamente</button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <School className="h-12 w-12 mx-auto mb-3 opacity-20"/>
          <p className="text-sm">Nenhuma escola encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtradas.map(escola => (
            <div key={escola.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <School className="h-5 w-5 text-blue-600"/>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-tight">{escola.nome}</p>
                  {escola.coordenacao && <p className="text-xs text-slate-500 mt-0.5">👤 {escola.coordenacao}</p>}
                </div>
              </div>

              {/* Endereço */}
              {escola.endereco && (
                <button onClick={() => abrirMaps(escola.endereco, escola.nome)}
                  className="w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition group">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 mt-0.5 shrink-0"/>
                  <span className="text-xs text-slate-500 group-hover:text-blue-600">{escola.endereco}</span>
                </button>
              )}

              {/* Botões de contato */}
              {escola.telefone && (
                <div className="flex gap-2">
                  <button onClick={() => ligar(escola.telefone)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition active:scale-95">
                    <Phone className="h-3.5 w-3.5"/>
                    {escola.telefone}
                  </button>
                  <button onClick={() => abrirWhatsApp(escola.telefone, escola.nome)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition active:scale-95 shrink-0">
                    <MessageCircle className="h-3.5 w-3.5"/>
                    WA
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
