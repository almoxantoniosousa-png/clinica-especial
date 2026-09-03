// Rotulo de exibicao pra cada role real do enum `user_role` — a tabela
// `atendentes` guarda bem mais que AT/Especialista (tem tambem adm, gestao,
// supervisora, aux_adm, apoio, financeiro cadastrados nela), entao qualquer
// lugar que rotula "quem esta na tabela atendentes" como Acompanhante por
// padrao acaba errando o cargo de todo mundo que nao for AT ou Especialista.
export const ROTULO_ROLE: Record<string, string> = {
  adm: "ADM",
  admin: "ADM",
  gestao: "Gestão",
  supervisora: "Supervisora",
  especialista: "Especialista",
  at: "Acompanhante Terapêutico",
  atendente: "Acompanhante Terapêutico",
  financeiro: "Financeiro",
  aux_adm: "Auxiliar Administrativo",
  apoio: "Apoio",
  familia: "Família",
};

export function rotuloRole(role: string | null | undefined): string {
  if (!role) return "";
  return ROTULO_ROLE[role.toLowerCase()] || role;
}
