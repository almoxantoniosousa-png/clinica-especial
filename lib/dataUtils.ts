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

// "YYYY-MM" -> "YYYY-MM-DD" do ultimo dia real do mes. `${mes}-31` parece
// inofensivo como limite superior de filtro, mas abr/jun/set/nov tem só 30
// dias e fev tem 28 ou 29 — usar "-31" fixo nesses meses gera um literal de
// data invalido, e o Postgres rejeita a query inteira (erro, não "sem
// resultados").
export function ultimoDiaDoMes(mesISO: string): string {
  const [ano, mes] = mesISO.split("-").map(Number);
  const dia = new Date(ano, mes, 0).getDate();
  return `${mesISO}-${String(dia).padStart(2, "0")}`;
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

// Domingo de Páscoa do ano (algoritmo de Meeus/Jones/Butcher) — base pra
// calcular os feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi).
function pascoaDoAno(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function somarDias(d: Date, dias: number): Date {
  const novo = new Date(d);
  novo.setDate(novo.getDate() + dias);
  return novo;
}

// Feriados nacionais fixos apenas — não cobre feriados estaduais/municipais
// (ex: 2 de julho na Bahia). Se a clínica precisar disso, dá pra estender.
const FERIADOS_FIXOS: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Dia Nacional de Zumbi e da Consciência Negra",
  "12-25": "Natal",
};

// Retorna o nome do feriado nacional se a data cair num, senão null.
export function feriadoNacional(dataISO: string): string | null {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const chave = `${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  if (FERIADOS_FIXOS[chave]) return FERIADOS_FIXOS[chave];

  const data = new Date(ano, mes - 1, dia);
  const pascoa = pascoaDoAno(ano);
  const movel: Record<string, string> = {
    [paraISOLocal(somarDias(pascoa, -48))]: "Carnaval (segunda)",
    [paraISOLocal(somarDias(pascoa, -47))]: "Carnaval (terça)",
    [paraISOLocal(somarDias(pascoa, -2))]: "Sexta-feira Santa",
    [paraISOLocal(somarDias(pascoa, 60))]: "Corpus Christi",
  };
  return movel[paraISOLocal(data)] || null;
}

// Datas comemorativas relevantes pra equipe da clínica (não são feriado,
// só lembrete pro ADM). Repetem todo ano no mesmo dia, por isso lista fixa.
// Não duplicar aqui feriados nacionais já conhecidos de todos (Natal,
// Independência, Tiradentes etc.) — esses já são tratados por
// FERIADOS_FIXOS/feriadoNacional() acima, com outra finalidade (bloquear
// lançamento de atendimento). Aqui é só pra datas que passariam batido.
const DATAS_COMEMORATIVAS: Record<string, string> = {
  "03-21": "Dia Mundial da Síndrome de Down",
  "04-02": "Dia Mundial de Conscientização do Autismo",
  "08-27": "Dia do Psicólogo",
  "09-09": "Dia do Administrador",
  "09-21": "Dia Nacional de Luta da Pessoa com Deficiência",
  "09-30": "Dia da Secretária",
  "10-12": "Dia das Crianças",
  "10-13": "Dia Mundial de Conscientização sobre o TDAH",
  "10-27": "Dia Mundial da Terapia Ocupacional",
  "12-09": "Dia do Fonoaudiólogo",
};

// Retorna o nome da data comemorativa se hoje cair numa, senão null.
export function dataComemorativaHoje(dataISO: string): string | null {
  const [, mes, dia] = dataISO.split("-").map(Number);
  const chave = `${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  return DATAS_COMEMORATIVAS[chave] || null;
}

export type ProximaDataComemorativa = { nome: string; data: string; diasRestantes: number };

// Próximas datas comemorativas a partir de hoje (não inclui hoje — isso já
// aparece no banner "hoje é...").
export function proximasDatasComemorativas(dataISO: string, quantidade = 3): ProximaDataComemorativa[] {
  const [anoAtual] = dataISO.split("-").map(Number);
  const hoje = new Date(dataISO + "T00:00:00");

  return Object.entries(DATAS_COMEMORATIVAS)
    .map(([chave, nome]) => {
      const [mes, dia] = chave.split("-").map(Number);
      let data = new Date(anoAtual, mes - 1, dia);
      if (paraISOLocal(data) <= dataISO) data = new Date(anoAtual + 1, mes - 1, dia);
      const diasRestantes = Math.round((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      return { nome, data: paraISOLocal(data), diasRestantes };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .slice(0, quantidade);
}
