"use client";

import { useEffect, useState } from "react";

type Noticia = { titulo: string; link: string; fonte: string; data: string };
type WeatherData = {
  current_condition?: Array<{
    temp_C: string;
    weatherCode: string;
    weatherDesc: Array<{ value: string }>;
    humidity: string;
    windspeedKmph: string;
    FeelsLikeC: string;
  }>;
  weather?: Array<{ maxtempC: string; mintempC: string }>;
};

function weatherEmoji(code: number): string {
  if (code === 113) return "☀️";
  if (code === 116) return "⛅";
  if ([119, 122].includes(code)) return "☁️";
  if ([143, 248, 260].includes(code)) return "🌫️";
  if ([200, 386, 389, 392, 395].includes(code)) return "⛈️";
  if ([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308].includes(code)) return "🌧️";
  if ([179, 182, 185, 227, 230].includes(code)) return "❄️";
  return "🌤️";
}

function saudacao(nome?: string) {
  const h = new Date().getHours();
  const turno = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const icone = h < 12 ? "☀️" : h < 18 ? "🌤️" : "🌙";
  return `${icone} ${turno}${nome ? `, ${nome.split(" ")[0]}` : ""}!`;
}

function formatarData() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function tempoRelativo(pubDate: string) {
  if (!pubDate) return "";
  try {
    const d = new Date(pubDate);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 60) return `${diff}min atrás`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`;
    return `${Math.floor(diff / 1440)}d atrás`;
  } catch { return ""; }
}

export function PainelInformacoes({ nome }: { nome?: string }) {
  const [hora, setHora] = useState("");
  const [data, setData] = useState("");
  const [clima, setClima] = useState<WeatherData | null>(null);
  const [climaErro, setClimaErro] = useState(false);
  const [noticias, setNoticias] = useState<Record<string, Noticia[]>>({ brasil: [], mundo: [], inclusao: [] });
  const [abaNoticia, setAbaNoticia] = useState<"brasil" | "mundo" | "inclusao">("brasil");
  const [loadingNoticias, setLoadingNoticias] = useState(true);

  // Relógio
  useEffect(() => {
    function tick() {
      const agora = new Date();
      setHora(agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setData(formatarData());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Clima
  useEffect(() => {
    fetch("/api/weather")
      .then(r => r.json())
      .then(d => { if (d.error) setClimaErro(true); else setClima(d); })
      .catch(() => setClimaErro(true));
  }, []);

  // Notícias
  useEffect(() => {
    async function carregar() {
      setLoadingNoticias(true);
      const [rb, rm, ri] = await Promise.all([
        fetch("/api/noticias?tipo=brasil").then(r => r.json()).catch(() => ({ items: [] })),
        fetch("/api/noticias?tipo=mundo").then(r => r.json()).catch(() => ({ items: [] })),
        fetch("/api/noticias?tipo=inclusao").then(r => r.json()).catch(() => ({ items: [] })),
      ]);
      setNoticias({ brasil: rb.items, mundo: rm.items, inclusao: ri.items });
      setLoadingNoticias(false);
    }
    carregar();
  }, []);

  const cc = clima?.current_condition?.[0];
  const wt = clima?.weather?.[0];
  const code = parseInt(cc?.weatherCode ?? "116");

  const abas = [
    { key: "brasil",   label: "🇧🇷 Brasil" },
    { key: "mundo",    label: "🌍 Mundo" },
    { key: "inclusao", label: "🧩 Inclusão & TEA" },
  ] as const;

  return (
    <div className="space-y-4">

      {/* Cabeçalho: saudação + relógio + data */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm">{saudacao(nome)}</p>
            <p className="text-4xl font-black text-white tracking-tight font-mono mt-1">{hora}</p>
            <p className="text-slate-400 text-xs mt-1 capitalize">{data}</p>
          </div>

          {/* Clima */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 min-w-[200px]">
            {climaErro ? (
              <p className="text-slate-400 text-sm">Clima indisponível</p>
            ) : !cc ? (
              <div className="flex gap-2 items-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                <p className="text-slate-400 text-sm">Carregando...</p>
              </div>
            ) : (
              <>
                <span className="text-4xl">{weatherEmoji(code)}</span>
                <div>
                  <p className="text-white font-black text-2xl">{cc.temp_C}°C</p>
                  <p className="text-slate-300 text-xs">{cc.weatherDesc[0]?.value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    ↑{wt?.maxtempC}° ↓{wt?.mintempC}° · 💧{cc.humidity}%
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">Salvador, BA</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notícias */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Abas */}
        <div className="flex border-b border-slate-100">
          {abas.map(aba => (
            <button key={aba.key} onClick={() => setAbaNoticia(aba.key)}
              className={`flex-1 py-3 text-xs font-semibold transition-all ${
                abaNoticia === aba.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}>
              {aba.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="divide-y divide-slate-100">
          {loadingNoticias ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-4/5 mb-1.5"/>
                <div className="h-2.5 bg-slate-100 rounded w-1/3"/>
              </div>
            ))
          ) : noticias[abaNoticia].length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Notícias indisponíveis no momento.
            </div>
          ) : (
            noticias[abaNoticia].map((n, i) => (
              <a key={i} href={n.link} target="_blank" rel="noreferrer"
                className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition group">
                <span className="text-slate-300 text-xs font-bold shrink-0 pt-0.5 w-5 text-right">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-snug group-hover:text-blue-700 transition line-clamp-2">
                    {n.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {n.fonte && (
                      <span className="text-[10px] text-slate-400">{n.fonte}</span>
                    )}
                    {n.data && (
                      <span className="text-[10px] text-slate-300">{tempoRelativo(n.data)}</span>
                    )}
                  </div>
                </div>
                <span className="text-slate-300 group-hover:text-blue-400 transition text-xs shrink-0 pt-0.5">↗</span>
              </a>
            ))
          )}
        </div>

        <div className="px-5 py-2 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">Fonte: Google News · Atualiza a cada 15 min</p>
          {abaNoticia === "inclusao" && (
            <p className="text-[10px] text-slate-400">Autismo · TEA · Inclusão · Tratamentos</p>
          )}
        </div>
      </div>
    </div>
  );
}
