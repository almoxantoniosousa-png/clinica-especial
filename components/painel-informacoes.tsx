"use client";

import { useEffect, useState } from "react";
import { primeiroNome } from "@/lib/dataUtils";

type Noticia = { titulo: string; link: string; fonte: string; data: string };
type WeatherData = {
  current_condition?: Array<{
    temp_C: string;
    weatherCode: string;
    weatherDesc: Array<{ value: string }>;
    humidity: string;
    windspeedKmph: string;
    winddir16Point: string;
    winddirDegree: string;
    FeelsLikeC: string;
    uvIndex: string;
    pressure: string;
    visibility: string;
  }>;
  weather?: Array<{ maxtempC: string; mintempC: string }>;
  nearest_area?: Array<{
    areaName: Array<{ value: string }>;
    region:   Array<{ value: string }>;
    country:  Array<{ value: string }>;
    latitude: string;
    longitude: string;
  }>;
};

type AirQuality = {
  current?: {
    european_aqi: number;
    us_aqi: number;
    pm10: number;
    pm2_5: number;
  };
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

const WEATHER_PT: Record<number, string> = {
  113: "Ensolarado",
  116: "Parcialmente nublado",
  119: "Nublado",
  122: "Encoberto",
  143: "Névoa",
  176: "Possibilidade de chuva",
  179: "Possibilidade de neve",
  182: "Possibilidade de granizo",
  185: "Garoa gelada",
  200: "Possibilidade de trovoada",
  227: "Neve com vento",
  230: "Tempestade de neve",
  248: "Névoa",
  260: "Névoa gelada",
  263: "Garoa leve",
  266: "Garoa",
  281: "Garoa gelada",
  284: "Garoa gelada intensa",
  293: "Chuva leve",
  296: "Chuva leve",
  299: "Chuva moderada",
  302: "Chuva moderada",
  305: "Chuva forte",
  308: "Chuva forte",
  311: "Chuva gelada leve",
  314: "Chuva gelada",
  317: "Granizo leve",
  320: "Granizo",
  323: "Neve leve",
  326: "Neve leve",
  329: "Neve moderada",
  332: "Neve moderada",
  335: "Neve intensa",
  338: "Neve intensa",
  350: "Granizo",
  353: "Pancada de chuva leve",
  356: "Pancada de chuva",
  359: "Chuva torrencial",
  362: "Granizo leve",
  365: "Granizo",
  368: "Neve com chuva leve",
  371: "Neve com chuva",
  374: "Granizo leve",
  377: "Granizo",
  386: "Chuva com trovoada",
  389: "Tempestade com chuva forte",
  392: "Neve com trovoada",
  395: "Tempestade de neve",
};

function descClima(code: number, fallback: string): string {
  return WEATHER_PT[code] ?? fallback;
}

const WIND_PT: Record<string, string> = {
  N:"Norte", NNE:"Norte-Nordeste", NE:"Nordeste", ENE:"Leste-Nordeste",
  E:"Leste", ESE:"Leste-Sudeste", SE:"Sudeste", SSE:"Sul-Sudeste",
  S:"Sul", SSW:"Sul-Sudoeste", SW:"Sudoeste", WSW:"Oeste-Sudoeste",
  W:"Oeste", WNW:"Oeste-Noroeste", NW:"Noroeste", NNW:"Norte-Noroeste",
};

function aqiLabel(aqi: number): { label: string; cor: string } {
  if (aqi <= 20)  return { label: "Boa",              cor: "text-emerald-400" };
  if (aqi <= 40)  return { label: "Razoável",          cor: "text-green-400"   };
  if (aqi <= 60)  return { label: "Moderada",          cor: "text-yellow-400"  };
  if (aqi <= 80)  return { label: "Ruim",              cor: "text-orange-400"  };
  if (aqi <= 100) return { label: "Muito ruim",        cor: "text-red-400"     };
  return              { label: "Extremamente ruim", cor: "text-purple-400"  };
}

function posicaoCardinal(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const lo = lon >= 0 ? "L" : "O";
  const latAbs = Math.abs(lat).toFixed(2);
  const lonAbs = Math.abs(lon).toFixed(2);
  return `${latAbs}°${ns} · ${lonAbs}°${lo}`;
}

function regiaooBrasil(lat: number, lon: number): string {
  if (lat > -5  && lon < -44) return "Norte";
  if (lat > -18 && lon > -48) return "Nordeste";
  if (lat > -5  && lon > -44) return "Nordeste";
  if (lat <= -22)             return "Sul";
  if (lat <= -18 && lat > -22 && lon > -50) return "Sudeste";
  if (lon < -50)              return "Centro-Oeste";
  return "Sudeste";
}

export function saudacao(nome?: string) {
  const h = new Date().getHours();
  const turno = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const icone = h < 12 ? "☀️" : h < 18 ? "🌤️" : "🌙";
  return `${icone} ${turno}${nome ? `, ${primeiroNome(nome)}` : ""}!`;
}

// Componente separado porque a saudação depende da hora local de quem
// acessa — calculada no servidor (SSR) ela pega o horário do servidor,
// não o do visitante, e mostra "Bom dia" errado fora do horário da manhã.
// Calculando só depois de montar no navegador garante o horário certo.
export function Saudacao({ nome }: { nome?: string }) {
  const [texto, setTexto] = useState("");

  useEffect(() => {
    setTexto(saudacao(nome));
    const id = setInterval(() => setTexto(saudacao(nome)), 60_000);
    return () => clearInterval(id);
  }, [nome]);

  return <>{texto}</>;
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

export function PainelInformacoes() {
  const [hora, setHora] = useState("");
  const [agora, setAgora] = useState<Date | null>(null);
  const [data, setData] = useState("");
  const [clima, setClima] = useState<WeatherData | null>(null);
  const [climaErro, setClimaErro] = useState(false);
  const [cidadeInput, setCidadeInput] = useState("");
  const [cidadeAtual, setCidadeAtual] = useState("Salvador, BA");
  const [loadingClima, setLoadingClima] = useState(true);
  const [ar, setAr]               = useState<AirQuality | null>(null);
  const [noticias, setNoticias] = useState<Record<string, Noticia[]>>({ brasil: [], mundo: [], inclusao: [] });
  const [abaNoticia, setAbaNoticia] = useState<"brasil" | "mundo" | "inclusao">("brasil");
  const [loadingNoticias, setLoadingNoticias] = useState(true);
  const [noticiasAbertas, setNoticiasAbertas] = useState(false);

  // Relógio
  useEffect(() => {
    function tick() {
      const d = new Date();
      setAgora(d);
      setHora(d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      setData(formatarData());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Clima
  function buscarClima(cidade?: string) {
    const alvo = cidade ?? "Salvador,BA";
    setLoadingClima(true);
    setClimaErro(false);
    fetch(`/api/weather?cidade=${encodeURIComponent(alvo)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setClimaErro(true); } else {
          setClima(d);
          setCidadeAtual(alvo.replace(",", ", "));
          // Busca qualidade do ar com as coordenadas retornadas
          const area = d.nearest_area?.[0];
          if (area?.latitude && area?.longitude) {
            fetch(`/api/air-quality?lat=${area.latitude}&lon=${area.longitude}`)
              .then(r => r.json()).then(setAr).catch(() => {});
          }
        }
      })
      .catch(() => setClimaErro(true))
      .finally(() => setLoadingClima(false));
  }

  useEffect(() => { buscarClima(); }, []);

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

  const cc   = clima?.current_condition?.[0];
  const wt   = clima?.weather?.[0];
  const area = clima?.nearest_area?.[0];
  const code = parseInt(cc?.weatherCode ?? "116");
  const aqi  = ar?.current?.european_aqi ?? null;
  const aqiInfo = aqi !== null ? aqiLabel(aqi) : null;
  const lat  = area ? parseFloat(area.latitude)  : null;
  const lon  = area ? parseFloat(area.longitude) : null;

  const segundos = agora?.getSeconds() ?? 0;
  const minutos = agora?.getMinutes() ?? 0;
  const horas12 = (agora?.getHours() ?? 0) % 12;
  const degSeg = segundos * 6;
  const degMin = (minutos + segundos / 60) * 6;
  const degHor = (horas12 + minutos / 60) * 30;

  const abas = [
    { key: "brasil",   label: "🇧🇷 Brasil" },
    { key: "mundo",    label: "🌍 Mundo" },
    { key: "inclusao", label: "🧩 Inclusão & TEA" },
  ] as const;

  return (
    <div className="space-y-4">

      {/* Cabeçalho: saudação + relógio + data */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Relógio analógico */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-24 h-24 rounded-full bg-white border-2 border-blue-200 shadow-lg flex-shrink-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 30}deg)` }}>
                  <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[9px] font-bold text-blue-900"
                    style={{ transform: `rotate(${-i * 30}deg)`, transformOrigin: "center" }}>
                    {i === 0 ? 12 : i}
                  </span>
                </div>
              ))}
              {agora && (
                <>
                  <div className="absolute bottom-1/2 left-1/2 w-1 h-5 bg-slate-800 rounded-full"
                    style={{ transform: `translateX(-50%) rotate(${degHor}deg)`, transformOrigin: "bottom center" }} />
                  <div className="absolute bottom-1/2 left-1/2 w-0.5 h-7 bg-blue-600 rounded-full"
                    style={{ transform: `translateX(-50%) rotate(${degMin}deg)`, transformOrigin: "bottom center" }} />
                </>
              )}
              <div className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 rounded-full ring-2 ring-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-tight font-mono leading-none">{hora}</p>
              <p className="text-blue-100 text-[11px] mt-1 capitalize leading-tight max-w-[130px]">{data}</p>
            </div>
          </div>

          {/* Clima */}
          <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <form onSubmit={e => { e.preventDefault(); if (cidadeInput.trim()) { buscarClima(cidadeInput.trim()); setCidadeInput(""); } }}
                className="flex gap-1.5 flex-1 min-w-0 max-w-[220px]">
                <input
                  value={cidadeInput}
                  onChange={e => setCidadeInput(e.target.value)}
                  placeholder="Buscar cidade..."
                  className="flex-1 min-w-0 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
                <button type="submit"
                  className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition flex-shrink-0">
                  🔍
                </button>
              </form>
            </div>

            {/* Dados do clima — tudo numa linha só, quebra se precisar */}
            {loadingClima ? (
              <div className="flex gap-2 items-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                <p className="text-blue-100 text-xs">Carregando...</p>
              </div>
            ) : climaErro ? (
              <p className="text-red-100 text-xs">Cidade não encontrada.</p>
            ) : cc ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl leading-none">{weatherEmoji(code)}</span>
                  <div>
                    <p className="text-white font-bold text-lg leading-none">{cc.temp_C}°C</p>
                    <p className="text-blue-100 text-[10px] mt-0.5">{descClima(code, cc.weatherDesc[0]?.value)}</p>
                  </div>
                </div>
                <p className="text-blue-100 text-xs">🌡️ <span className="text-white">{cc.FeelsLikeC}°C</span> <span className="text-blue-200">↑{wt?.maxtempC}° ↓{wt?.mintempC}°</span></p>
                <p className="text-blue-100 text-xs">💧 <span className="text-white">{cc.humidity}%</span></p>
                <p className="text-blue-100 text-xs">💨 <span className="text-white">{cc.windspeedKmph} km/h</span> {WIND_PT[cc.winddir16Point] ?? cc.winddir16Point}</p>
                {aqiInfo && (
                  <p className="text-blue-100 text-xs">🌿 <span className={`font-semibold ${aqiInfo.cor}`}>{aqiInfo.label}</span></p>
                )}
                {lat !== null && lon !== null && (
                  <p className="text-blue-200 text-[10px] basis-full">
                    📍 {cidadeAtual} · {posicaoCardinal(lat, lon)}
                    {regiaooBrasil(lat, lon) !== "Sudeste" || lat < -5 ? ` · ${regiaooBrasil(lat, lon)}` : ""}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Notícias */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setNoticiasAbertas(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition text-left">
          <div className="flex items-center gap-2">
            <span className="text-base">📰</span>
            <span className="text-sm font-semibold text-slate-800">Notícias Nacionais e Internacionais</span>
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${noticiasAbertas ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {noticiasAbertas && (
        <>
        {/* Abas */}
        <div className="flex border-t border-slate-100">
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
        </>
        )}
      </div>
    </div>
  );
}
