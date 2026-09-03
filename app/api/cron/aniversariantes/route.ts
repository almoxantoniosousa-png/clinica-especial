import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rotuloRole } from "@/lib/roles";

const ROLES_AVISADAS = ["adm", "gestao"];

// "AAAA-MM-DD" direto da string, sem passar por Date — mesmo motivo do
// dashboard: converter pra fuso local jogaria o dia pra véspera.
function mesDia(dataISO: string) {
  return dataISO.slice(5, 10);
}

function hojeMesDiaBahia() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return partes.slice(5, 10); // "MM-DD"
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const hoje = hojeMesDiaBahia();

  const [{ data: atendentes }, { data: internas }, { data: criancas }] = await Promise.all([
    admin.from("atendentes").select("nome, data_nascimento, role").not("data_nascimento", "is", null),
    admin.from("colaboradoras_internas").select("nome, data_nascimento, cargo").not("data_nascimento", "is", null),
    admin.from("criancas").select("nome, data_nascimento").eq("ativo", true).not("data_nascimento", "is", null),
  ]);

  const todos = [
    ...(atendentes || []).map(a => ({ nome: a.nome, data_nascimento: a.data_nascimento, tipo: rotuloRole(a.role) })),
    ...(internas || []).map(i => ({ nome: i.nome, data_nascimento: i.data_nascimento, tipo: i.cargo || "Equipe" })),
    ...(criancas || []).map(c => ({ nome: c.nome, data_nascimento: c.data_nascimento, tipo: "Criança" })),
  ];

  const aniversariantesHoje = todos.filter(p => mesDia(p.data_nascimento) === hoje);

  if (aniversariantesHoje.length === 0) {
    return NextResponse.json({ ok: true, aniversariantes: 0 });
  }

  const inicioDoDia = new Date();
  inicioDoDia.setUTCHours(0, 0, 0, 0);

  const { data: jaEnviadas } = await admin
    .from("notificacoes")
    .select("destinatario_role, mensagem")
    .eq("tipo", "aniversario")
    .gte("created_at", inicioDoDia.toISOString());

  const paraInserir: { destinatario_role: string; titulo: string; mensagem: string; tipo: string; link: string; autor_nome: string }[] = [];
  for (const p of aniversariantesHoje) {
    for (const role of ROLES_AVISADAS) {
      const jaTem = (jaEnviadas || []).some(n => n.destinatario_role === role && n.mensagem?.includes(p.nome));
      if (jaTem) continue;
      paraInserir.push({
        destinatario_role: role,
        titulo: "🎂 Aniversariante do dia",
        mensagem: `${p.nome} (${p.tipo}) está de aniversário hoje!`,
        tipo: "aniversario",
        link: role === "adm" ? "/adm/dashboard" : "/gestao/dashboard",
        autor_nome: "Sistema",
      });
    }
  }

  if (paraInserir.length > 0) {
    await admin.from("notificacoes").insert(paraInserir);
  }

  return NextResponse.json({ ok: true, aniversariantes: aniversariantesHoje.map(p => p.nome), notificacoesCriadas: paraInserir.length });
}
