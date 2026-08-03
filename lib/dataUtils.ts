// `new Date().toISOString().split("T")[0]` parece inofensivo, mas converte
// pra UTC antes de cortar a data — no Brasil (UTC-3), qualquer horário
// depois das ~21h já cai no dia seguinte em UTC, fazendo "hoje" virar
// amanhã. Use hojeLocal()/paraISOLocal() em vez disso pra pegar a data
// realmente local do navegador.
export function hojeLocal(): string {
  return paraISOLocal(new Date());
}

export function paraISOLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// `nome.split(" ").slice(0, 2)` parece inofensivo, mas em nomes com
// conector no meio ("Maria de Fátima", "João da Silva") corta bem no lugar
// errado ("Maria de", "João da") — o conector conta como uma das 2
// "palavras", roubando o segundo nome de verdade. Essas duas funções pulam
// conectores ao contar.
const CONECTORES_NOME = new Set(["de", "da", "do", "das", "dos", "e"]);

export function primeiroNome(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/);
  const resultado: string[] = [];
  let nomesReais = 0;
  for (const parte of partes) {
    resultado.push(parte);
    if (CONECTORES_NOME.has(parte.toLowerCase())) continue;
    nomesReais++;
    if (nomesReais >= 2) break;
  }
  return resultado.join(" ");
}

export function iniciaisNome(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(/\s+/).filter((p) => !CONECTORES_NOME.has(p.toLowerCase()));
  return partes.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function mesAtualLocal(): string {
  return hojeLocal().slice(0, 7);
}

// Pra código que roda no servidor (Server Actions): lá o relógio da máquina
// não é o do Brasil (Vercel roda em UTC), então `hojeLocal()` erraria do
// mesmo jeito, só que sempre, não só à noite. Fixa o fuso do Brasil
// explicitamente (sem horário de verão desde 2019, por isso um valor só).
export function hojeBrasil(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(new Date());
}
