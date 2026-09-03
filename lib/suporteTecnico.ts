// Numero de WhatsApp do suporte tecnico
export const SUPORTE_TECNICO_WHATSAPP = "71999319796";

export function linkSuporteTecnico(texto: string) {
  return `https://wa.me/55${SUPORTE_TECNICO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

// "71999319796" -> "(71) 99931-9796"
export function formatarSuporteTecnicoWhatsApp() {
  const ddd = SUPORTE_TECNICO_WHATSAPP.slice(0, 2);
  const resto = SUPORTE_TECNICO_WHATSAPP.slice(2);
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}
