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
