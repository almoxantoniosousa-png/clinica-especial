"use client";

import { EscalaManager } from "@/components/escala-manager";

export default function SupervisoraEscalaEspecialistasPage() {
  return (
    <EscalaManager
      rolesPermitidos={["especialista"]}
      titulo="Escala — Especialistas"
      subtitulo="Cadastro semanal de atendimentos dos especialistas"
    />
  );
}
