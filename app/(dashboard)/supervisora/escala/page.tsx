"use client";

import { EscalaManager } from "@/components/escala-manager";

export default function SupervisoraEscalaPage() {
  return (
    <EscalaManager
      rolesPermitidos={["especialista", "atendente"]}
      titulo="Escala — Especialistas e Acompanhantes"
      subtitulo="Cadastro semanal de atendimentos"
    />
  );
}
