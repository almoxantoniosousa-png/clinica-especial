"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { ExternalLink, BookOpen } from "lucide-react";

type Lei = { id: string; titulo: string; descricao: string; etiqueta: string | null; link: string };

export default function LegislacaoApoioPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [leis, setLeis] = useState<Lei[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("legislacao_apoio").select("id, titulo, descricao, etiqueta, link").order("created_at");
      setLeis((data || []) as Lei[]);
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📚 Legislação de Apoio</h1>
        <p className="text-xs text-slate-400 mt-0.5">Leis e normas que amparam a atuação em psicologia e os direitos da criança especial</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">Carregando...</p>
        </div>
      ) : leis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Nenhuma lei cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leis.map(l => (
            <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="space-y-1.5">
                {l.etiqueta && (
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-100">
                    {l.etiqueta}
                  </span>
                )}
                <h3 className="font-bold text-slate-800 text-base">{l.titulo}</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{l.descricao}</p>
              <a href={l.link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-blue-700 rounded-lg border border-slate-200 transition break-all">
                <ExternalLink className="h-3 w-3 flex-shrink-0" /> {l.link}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
