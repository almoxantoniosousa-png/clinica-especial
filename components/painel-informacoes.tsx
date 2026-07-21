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
  const [cidadeInput, setCidadeInput] = useState("");
  const [cidadeAtual, setCidadeAtual] = useState("Salvador, BA");
  const [loadingClima, setLoadingClima] = useState(true);
  const [ar, setAr]               = useState<AirQuality | null>(null);
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

  const abas = [
    { key: "brasil",   label: "🇧🇷 Brasil" },
    { key: "mundo",    label: "🌍 Mundo" },
    { key: "inclusao", label: "🧩 Inclusão & TEA" },
  ] as const;

  return (
    <div className="space-y-4">

      {/* Cabeçalho: saudação + relógio + data */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-50 text-base font-light tracking-wide">{saudacao(nome)}</p>
            <p className="text-blue-100/60 text-sm font-light tracking-wide mt-1">A Clínica Abraço te deseja um excelente trabalho</p>
            <p className="text-4xl font-black text-white tracking-tight font-mono mt-2">{hora}</p>
            <p className="text-blue-100 text-xs mt-1 capitalize">{data}</p>
          </div>

          {/* Clima */}
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 min-w-[240px] space-y-3">
            {/* Busca de cidade */}
            <form onSubmit={e => { e.preventDefault(); if (cidadeInput.trim()) { buscarClima(cidadeInput.trim()); setCidadeInput(""); } }}
              className="flex gap-2">
              <input
                value={cidadeInput}
                onChange={e => setCidadeInput(e.target.value)}
                placeholder="Buscar cidade..."
                className="flex-1 min-w-0 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-white/40"
              />
              <button type="submit"
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition">
                🔍
              </button>
            </form>

            {/* Dados do clima */}
            {loadingClima ? (
              <div className="flex gap-2 items-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                <p className="text-blue-100 text-xs">Carregando...</p>
              </div>
            ) : climaErro ? (
              <p className="text-red-100 text-xs">Cidade não encontrada.</p>
            ) : cc ? (
              <div className="space-y-2.5">
                {/* Temperatura principal */}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{weatherEmoji(code)}</span>
                  <div>
                    <p className="text-white font-bold text-2xl leading-none">{cc.temp_C}°C</p>
                    <p className="text-blue-100 text-xs mt-0.5">{descClima(code, cc.weatherDesc[0]?.value)}</p>
                  </div>
                </div>
                {/* Grade de detalhes */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p className="text-blue-100 text-xs">🌡️ Sensação: <span className="text-white">{cc.FeelsLikeC}°C</span></p>
                  <p className="text-blue-100 text-xs">↑{wt?.maxtempC}° ↓{wt?.mintempC}°</p>
                  <p className="text-blue-100 text-xs">💧 Umidade: <span className="text-white">{cc.humidity}%</span></p>
                  <p className="text-blue-100 text-xs">💨 {cc.windspeedKmph} km/h</p>
                  <p className="text-blue-100 text-xs col-span-2">
                    🧭 Vento: <span className="text-white">{WIND_PT[cc.winddir16Point] ?? cc.winddir16Point}</span>
                  </p>
                  {aqiInfo && (
                    <p className="text-blue-100 text-xs col-span-2">
                      🌿 Ar: <span className={`font-semibold ${aqiInfo.cor}`}>{aqiInfo.label}</span>
                      <span className="text-blue-200 ml-1">(IQA {aqi})</span>
                    </p>
                  )}
                  {lat !== null && lon !== null && (
                    <p className="text-blue-200 text-[10px] col-span-2 mt-0.5">
                      📍 {cidadeAtual} · {posicaoCardinal(lat, lon)}
                      {regiaooBrasil(lat, lon) !== "Sudeste" || lat < -5 ? ` · ${regiaooBrasil(lat, lon)}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
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
