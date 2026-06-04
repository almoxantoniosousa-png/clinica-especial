"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function GestaoCriancasPage() {
  const router = useRouter();
  const [criancas, setCriancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");
    const { data, error } = await supabase.from("criancas").select("*").order("nome");
    if (error) { setErro("Erro ao carregar as crianças: " + error.message); setLoading(false); return; }
    setCriancas(data || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const filtradas = criancas.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  function calcularIdade(dataNascimento: string | null): string {
    if (!dataNascimento) return "";
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= 0 ? `${idade} anos` : "";
  }

  function abrirWhatsApp(telefone: string, nome: string) {
    const numero = telefone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Ola! Somos da Clinica Abraco ABA. Entramos em contato referente ao atendimento de ${nome}.`);
    window.open(`https://wa.me/55${numero}?text=${msg}`, "_blank");
  }

  function abrirEmail(email: string, nome: string) {
    window.open(`mailto:${email}?subject=Clinica Abraco ABA - ${nome}`, "_blank");
  }

  function abrirInstagram(instagram: string) {
    const user = instagram.replace("@", "");
    window.open(`https://instagram.com/${user}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-4 pb-6 md:px-8 md:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/gestao/dashboard")}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex-shrink-0">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Criancas</h1>
          <p className="text-xs text-slate-400 mt-1">Visao geral dos estudantes</p>
        </div>
      </div>

      <input type="text" placeholder="Buscar crianca..." value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : erro ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-red-200 gap-3">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-red-600 font-medium">{erro}</p>
          <button onClick={carregar} className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl border border-red-200 hover:bg-red-100 transition">
            Tentar novamente
          </button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <span className="text-4xl">👶</span>
          <p className="text-sm text-slate-400 mt-2">Nenhuma crianca encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              {/* Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 flex-shrink-0">
                  {c.nome?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{c.nome}</p>
                  <p className="text-xs text-slate-400">{calcularIdade(c.data_nascimento)}</p>
                </div>
              </div>

              {/* Dados */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                {c.diagnostico && <p>Diagnostico: <span className="font-medium text-slate-700">{c.diagnostico}</span></p>}
                {c.modalidade && <p>Modalidade: <span className="font-medium text-slate-700">{c.modalidade}</span></p>}
                <p>Status: <span className={"font-semibold " + (c.ativo ? "text-emerald-600" : "text-red-500")}>{c.ativo ? "Ativo" : "Inativo"}</span></p>
              </div>

              {/* Botoes de contato */}
              <div className="flex gap-2">
                {c.telefone_responsavel ? (
                  <button
                    onClick={() => abrirWhatsApp(c.telefone_responsavel, c.nome)}
                    className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition active:scale-95"
                    title="WhatsApp"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.302-1.506A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.189-1.427l-.371-.221-3.742.894.939-3.648-.242-.384A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    WhatsApp
                  </button>
                ) : (
                  <div className="flex-1 h-9 flex items-center justify-center text-xs text-slate-300 rounded-xl border border-slate-100 bg-slate-50">
                    Sem tel.
                  </div>
                )}

                {c.email_responsavel ? (
                  <button
                    onClick={() => abrirEmail(c.email_responsavel, c.nome)}
                    className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition active:scale-95"
                    title="Email"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Email
                  </button>
                ) : (
                  <div className="flex-1 h-9 flex items-center justify-center text-xs text-slate-300 rounded-xl border border-slate-100 bg-slate-50">
                    Sem email
                  </div>
                )}

                {c.instagram ? (
                  <button
                    onClick={() => abrirInstagram(c.instagram)}
                    className="h-9 w-9 flex items-center justify-center bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl border border-pink-200 transition active:scale-95 flex-shrink-0"
                    title="Instagram"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}